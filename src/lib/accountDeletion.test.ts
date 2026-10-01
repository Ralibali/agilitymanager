import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ configured: true, getSession: vi.fn(), invoke: vi.fn(), signOut: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  get isSupabaseConfigured() { return mock.configured; },
  supabase: { auth: { getSession: mock.getSession, signOut: mock.signOut }, functions: { invoke: mock.invoke } },
}));
import { deleteSignedInAccount } from "./accountDeletion";

beforeEach(() => {
  vi.clearAllMocks();
  mock.configured = true;
  mock.getSession.mockResolvedValue({ data: { session: { access_token: "user-jwt", user: { id: "current" } } }, error: null });
  mock.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
});

describe("account deletion client", () => {
  it("sends only confirmation and the signed-in JWT, then removes the local session", async () => {
    expect(await deleteSignedInAccount("RADERA", "current")).toEqual({ deleted: true, localSessionCleared: true });
    expect(mock.invoke).toHaveBeenCalledWith("delete-account", {
      headers: { Authorization: "Bearer user-jwt" }, body: { confirmation: "RADERA" },
    });
    expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not make a destructive call when the displayed account changed", async () => {
    await expect(deleteSignedInAccount("RADERA", "another")).rejects.toThrow(/Logga in/);
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation and a signed-in account", async () => {
    await expect(deleteSignedInAccount("radera", "current")).rejects.toThrow(/bekräfta/);
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(deleteSignedInAccount("RADERA", "current")).rejects.toThrow(/Logga in/);
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("does not sign out or claim success on an unavailable endpoint", async () => {
    mock.invoke.mockResolvedValue({ data: null, error: new Error("not deployed") });
    await expect(deleteSignedInAccount("RADERA", "current")).rejects.toThrow(/info@auroramedia.se/);
    expect(mock.signOut).not.toHaveBeenCalled();
  });
  it("preserves a confirmed deletion even if local session cleanup fails", async () => {
    mock.signOut.mockRejectedValue(new Error("network"));
    expect(await deleteSignedInAccount("RADERA", "current")).toEqual({ deleted: true, localSessionCleared: false });
  });
});
