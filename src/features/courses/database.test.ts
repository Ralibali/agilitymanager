import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("instructor courses database boundaries", () => {
  it("enforces role grants, RLS, capability ownership, capacity, FIFO and manual payment evidence in PostgreSQL", () => {
    const output = execFileSync(process.execPath, ["scripts/verify-courses-db.mjs"], {
      encoding: "utf8",
      timeout: 40_000,
    });
    const result = /Courses database: (\d+) checks passed/.exec(output);
    expect(result, output).not.toBeNull();
    expect(Number(result?.[1])).toBeGreaterThanOrEqual(134);
  }, 45_000);
});
