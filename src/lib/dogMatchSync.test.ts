import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isEmptyStore, pickWinner } from "./dogMatchSync";
import { createProfile, type DogProfileStore } from "./dogMatch";

function store(name: string, updatedAt?: number): DogProfileStore {
  const p = createProfile({ name });
  return { profiles: [p], activeId: p.id, updatedAt };
}

describe("dogMatchSync", () => {
  it("ser en orörd standardprofil som tom", () => {
    expect(isEmptyStore(store(""))).toBe(true);
    expect(isEmptyStore(store("Vilma"))).toBe(false);
    expect(isEmptyStore(store("", 5))).toBe(false);
  });

  it("behåller lokalt när kontot saknar profiler", () => {
    const local = store("Vilma", 10);
    expect(pickWinner(local, null)).toEqual({ winner: local, source: "local" });
  });

  it("hämtar kontots profiler när lokalt är tomt", () => {
    const remote = store("Bosse", 1);
    expect(pickWinner(store(""), remote).source).toBe("remote");
  });

  it("låter senaste ändringen vinna", () => {
    expect(pickWinner(store("Vilma", 10), store("Bosse", 20)).source).toBe("remote");
    expect(pickWinner(store("Vilma", 30), store("Bosse", 20)).source).toBe("local");
  });
});
