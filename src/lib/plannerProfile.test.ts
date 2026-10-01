import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cloud = vi.hoisted(() => ({ loaded: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => {
  cloud.loaded();
  return { supabase: { functions: { invoke: cloud.invoke } } };
});

const existingProfile = { id: "profile-1", name: "Anna", email: "anna@example.com", token: "private-proof" };
let storedProfile: string | null;
const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
const dispatchEvent = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("VITE_NATIVE_APP", "true");
  storedProfile = JSON.stringify(existingProfile);
  storage.getItem.mockImplementation(() => storedProfile);
  storage.setItem.mockImplementation((_key: string, value: string) => { storedProfile = value; });
  storage.removeItem.mockImplementation(() => { storedProfile = null; });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { dispatchEvent });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("standalone mobile planner profile boundary", () => {
  it("does not initialize the cloud client or read an old profile on import", async () => {
    const { readProfile } = await import("./plannerProfile");
    expect(readProfile()).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(cloud.loaded).not.toHaveBeenCalled();
  });

  it("keeps old profile storage untouched without enabling it in the mobile app", async () => {
    const { writeProfile } = await import("./plannerProfile");
    writeProfile(existingProfile);
    writeProfile(null);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("rejects profile creation and social requests before loading a network client", async () => {
    const { signInWithNameEmail, plannerApi } = await import("./plannerProfile");
    await expect(signInWithNameEmail("Anna", "anna@example.com")).rejects.toThrow(/Banprofiler/);
    await expect(plannerApi("save-course", { courseData: { name: "Private course" } })).rejects.toThrow(/Molndelning/);
    expect(cloud.loaded).not.toHaveBeenCalled();
    expect(cloud.invoke).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("preserves the existing profile proof and social calls on the website", async () => {
    vi.stubEnv("VITE_NATIVE_APP", "false");
    const { signInWithNameEmail, plannerApi } = await import("./plannerProfile");
    cloud.invoke.mockResolvedValueOnce({ data: { profile: existingProfile }, error: null });
    expect(await signInWithNameEmail("  Anna  ", "ANNA@example.com")).toEqual(existingProfile);
    expect(cloud.invoke).toHaveBeenCalledWith("planner-social", {
      body: { action: "profile", name: "Anna", email: "anna@example.com", token: "private-proof" },
    });
    cloud.invoke.mockResolvedValueOnce({ data: { courses: [] }, error: null });
    expect(await plannerApi("my-courses")).toEqual({ courses: [] });
    expect(cloud.invoke).toHaveBeenLastCalledWith("planner-social", {
      body: { action: "my-courses", profileId: "profile-1", token: "private-proof" },
    });
  });
});
