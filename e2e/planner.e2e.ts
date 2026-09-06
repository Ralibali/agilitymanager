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
  await expect.poll(() => draft(page)).not.toBeNull();
}

const importedCourse = {
  version: 2,
  name: "FCI-regression",
  sport: "hoopers",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  ruleSetId: "hoopers-fci-2026",
  classTemplate: "hoopers_fci_h2",
  obstacles: [{ id: "t", type: "tunnel", x: 15, y: 20, rotation: 30, number: 1, curveDeg: 90, curveSide: "left" }],
};

async function importCourse(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "fci.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedCourse)),
  });
  await expect.poll(async () => (await draft(page))?.name).toBe(importedCourse.name);
}

async function saveCourse(page: Page) {
  await page.getByRole("button", { name: /^Bana-meny/ }).click();
  await page.getByRole("menuitem", { name: /^Spara bana/ }).click();
}

test("JSON-import, export, sparning och omladdning behåller valt regelverk och tunnel", async ({ page }) => {
  await openPlanner(page);
  await importCourse(page);
  const expected = {
    ruleSetId: importedCourse.ruleSetId,
    classTemplate: importedCourse.classTemplate,
    obstacles: [expect.objectContaining({ curveDeg: 90, curveSide: "left", rotation: 30 })],
  };
  expect(await draft(page)).toMatchObject(expected);

  await page.getByRole("button", { name: "Ladda ner eller exportera bana", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportera JSON", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toMatchObject(expected);

  await saveCourse(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses")!)[0].data)).toMatchObject(expected);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(importedCourse.name);
  expect(await draft(page)).toMatchObject(expected);
});

test("misslyckad manuell sparning visar fel och behåller osparad status tills nytt försök lyckas", async ({ page }) => {
  await openPlanner(page);
  await importCourse(page);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "am_planner_local_courses") throw new DOMException("Full", "QuotaExceededError");
      setItem.call(this, key, value);
    };
  });
  await saveCourse(page);
  await expect(page.getByText("Banan kunde inte sparas. Exportera den som JSON för att behålla ditt arbete.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bana-meny/ })).toHaveAccessibleName("Bana-meny. Osparade ändringar");
  expect(await page.evaluate(() => localStorage.getItem("am_planner_local_courses"))).toBeNull();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(importedCourse.name);
  await saveCourse(page);
  await expect(page.getByRole("button", { name: /^Bana-meny/ })).toHaveAccessibleName(/^Bana-meny\. Sparad/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses")!)[0].data.name)).toBe(importedCourse.name);
});

test("autosparfel visas och försök igen sparar banan", async ({ page }) => {
  await openPlanner(page);
  await page.evaluate((keyToBlock) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === keyToBlock) {
        Storage.prototype.setItem = setItem;
        throw new DOMException("Blocked", "SecurityError");
      }
      setItem.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.getByRole("textbox", { name: "Banans namn" }).fill("Återställt utkast");
  await expect(page.getByRole("status").filter({ hasText: "Kunde inte spara" })).toBeVisible();
  await page.getByRole("button", { name: "Försök spara igen", exact: true }).click();
  await expect.poll(async () => (await draft(page))?.name).toBe("Återställt utkast");
  await expect(page.getByRole("status").filter({ hasText: "Sparad i den här webbläsaren" })).toBeVisible();
});

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
