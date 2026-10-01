import { beforeEach, expect, it, vi } from "vitest";
import { downloadIcs } from "./competitionData";

const exportFile = vi.hoisted(() => vi.fn());
vi.mock("./exportFile", () => ({ exportFile }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

beforeEach(() => {
  exportFile.mockReset();
  exportFile.mockResolvedValue(undefined);
});

it("exports calendar data through the shared helper and retains the ics extension", async () => {
  const ics = "BEGIN:VCALENDAR\r\nEND:VCALENDAR";
  await downloadIcs("tavling", ics);
  expect(exportFile).toHaveBeenCalledWith(expect.any(Blob), "tavling.ics");
  const blob: Blob = exportFile.mock.calls[0][0];
  expect(blob.type).toBe("text/calendar;charset=utf-8");
  expect(await blob.text()).toBe(ics);
  await downloadIcs("tavling.ics", ics);
  expect(exportFile.mock.calls[1][1]).toBe("tavling.ics");
});

it("propagates asynchronous calendar export failures to its callers", async () => {
  exportFile.mockRejectedValueOnce(new Error("share unavailable"));
  await expect(downloadIcs("tavling", "ics")).rejects.toThrow("share unavailable");
});
