import { expect, test, type Page } from "@playwright/test";

/**
 * Regressionstest för banplaneraren i riktig webbläsare.
 *
 * Täcker det som enhetstesterna inte kan se: att placera och böja en tunnel,
 * att dra den ger ETT ångra-steg, att ångra även återställer inställningar
 * (storleksklass), att sparstatusen är sann och att banan överlever omladdning.
 */

const STORAGE_KEY = "am-redesign-planner-v2";

async function draft(page: Page) {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function canvasBox(page: Page) {
  const boxes = await page.locator("svg").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  return boxes.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
}

async function openPlanner(page: Page) {
  await page.goto("/banplanerare", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();
}

test("tunnel: placera, böj, dra, ångra och ladda om", async ({ page }) => {
  await openPlanner(page);
  const box = await canvasBox(page);

  await page.getByRole("button", { name: /tunnel/i }).first().click();
  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await draft(page))?.obstacles?.length).toBe(1);

  // Markera tunneln och böj den.
  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5);
  const slider = page.locator("input[type=range]").last();
  await slider.waitFor();
  await slider.fill("75");
  await slider.dispatchEvent("change");
  await expect.poll(async () => (await draft(page))?.obstacles?.[0]?.curveDeg).toBe(75);

  // Dragning ska ge exakt ett ångra-steg och flytta hindret.
  const before = (await draft(page)).obstacles[0];
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.38, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const o = (await draft(page)).obstacles[0];
      return o.x !== before.x || o.y !== before.y;
    })
    .toBe(true);

  await page.getByRole("button", { name: "Ångra", exact: false }).first().click();
  await expect
    .poll(async () => {
      const o = (await draft(page)).obstacles[0];
      return [o.x, o.y];
    })
    .toEqual([before.x, before.y]);

  // Sparstatus ska vara sann, och banan ska finnas kvar efter omladdning.
  await expect(page.getByRole("status").first()).toContainText(/sparad i den här webbläsaren/i);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await draft(page))?.obstacles?.length).toBe(1);
  expect((await draft(page)).obstacles[0].curveDeg).toBe(75);
});

test("ångra återställer även inställningar och regelverk följer med", async ({ page }, testInfo) => {
  // Inställningspanelen (storleksklass m.m.) visas bara i desktopbredd.
  test.skip(testInfo.project.name === "mobil", "Sidopanelen finns bara på desktop");
  await openPlanner(page);

  const start = await draft(page);
  expect(start.ruleSetId).toBeTruthy();

  await page.getByRole("button", { name: "XS", exact: true }).first().click();
  await expect.poll(async () => (await draft(page)).sizeClass).toBe("XS");

  await page.getByRole("button", { name: "Ångra", exact: false }).first().click();
  await expect.poll(async () => (await draft(page)).sizeClass).toBe(start.sizeClass);

  await page.reload({ waitUntil: "domcontentloaded" });
  expect((await draft(page)).ruleSetId).toBe(start.ruleSetId);
});
