import { expect, test, type Page } from "@playwright/test";

/**
 * Regressionstest för banbyggarverktygen: numreringsläge, flerval,
 * justering, kopiera/klistra in, piltangenter, markeringsruta, måttband och
 * avståndsetiketter. Banan läses in via JSON så att positionerna är kända.
 */

const STORAGE_KEY = "am-redesign-planner-v2";

type Ob = { id: string; type: string; x: number; y: number; rotation: number };

const course = {
  version: 2,
  name: "Verktygstest",
  sport: "agility",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  obstacles: [
    { id: "s", type: "start", x: 2, y: 20, rotation: 90 },
    { id: "a", type: "jump", x: 5, y: 20, rotation: 90, number: 1 },
    { id: "b", type: "jump", x: 11, y: 20, rotation: 90, number: 2 },
    { id: "c", type: "jump", x: 17, y: 20, rotation: 90, number: 3 },
    { id: "d", type: "jump", x: 23, y: 20, rotation: 90, number: 4 },
    { id: "e", type: "jump", x: 11, y: 30, rotation: 0, number: 5 },
  ],
};

async function draft(page: Page) {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function obstacles(page: Page): Promise<Ob[]> {
  return (await draft(page))?.obstacles ?? [];
}

/** Id för hindret på en given position (JSON-importen ger nya id:n). */
async function idAt(page: Page, x: number, y: number) {
  const ob = (await obstacles(page)).find((o) => Math.abs(o.x - x) < 0.01 && Math.abs(o.y - y) < 0.01);
  if (!ob) throw new Error(`Inget hinder på ${x},${y}`);
  return ob.id;
}

/** Tävlande hinder i banordning, som positioner. */
async function order(page: Page) {
  return (await obstacles(page)).filter((o) => o.type !== "start").map((o) => `${o.x},${o.y}`);
}

/** Skärmkoordinat för en punkt på planen (meter). */
async function screenOf(page: Page, x: number, y: number) {
  return page.evaluate(
    ([fx, fy]) => {
      const svgs = [...document.querySelectorAll("svg")] as SVGSVGElement[];
      const svg = svgs.reduce((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return rb.width * rb.height > ra.width * ra.height ? b : a;
      });
      const pt = svg.createSVGPoint();
      pt.x = fx;
      pt.y = fy;
      const p = pt.matrixTransform(svg.getScreenCTM()!);
      return { x: p.x, y: p.y };
    },
    [x, y],
  );
}

async function openWithCourse(page: Page) {
  await page.goto("/banplanerare", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Endast nödvändiga", exact: true }).click();
  await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();
  await page.locator('input[type="file"]').setInputFiles({
    name: "verktyg.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(course)),
  });
  await expect.poll(async () => (await draft(page))?.name).toBe(course.name);
  await expect.poll(async () => (await obstacles(page)).length).toBe(6);
}

const badge = (page: Page, id: string) => page.locator(`[data-obstacle-ref="${id}"]`);

test("numreringsläge: klicka i ordning, backa, klar och ångra hela numreringen", async ({ page }) => {
  await openWithCourse(page);
  const before = await order(page);
  const e = await idAt(page, 11, 30);
  const c = await idAt(page, 17, 20);

  await page.getByRole("button", { name: /^Numrera/ }).first().click();
  const banner = page.getByRole("status").filter({ hasText: "Klicka hinder" });
  await expect(banner).toContainText("#1");

  await badge(page, e).click();
  await badge(page, c).click();
  await expect(banner).toContainText("#3");
  await banner.getByRole("button", { name: "Backa" }).click();
  await expect(banner).toContainText("#2");
  await badge(page, c).click();
  await banner.getByRole("button", { name: "Klar" }).click();
  await expect(banner).toHaveCount(0);

  await expect.poll(() => order(page)).toEqual(["11,30", "17,20", "5,20", "11,20", "23,20"]);

  // Hela numreringen är ETT ångra-steg.
  await page.getByRole("button", { name: "Ångra", exact: false }).first().click();
  await expect.poll(() => order(page)).toEqual(before);
});

test("flerval: shift-klick, justera, kopiera/klistra in, piltangent och ta bort", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobil", "Tangentbord och Shift-klick är desktopflöden");
  await openWithCourse(page);
  const a = await idAt(page, 5, 20);
  const e = await idAt(page, 11, 30);

  await badge(page, a).click();
  await badge(page, e).click({ modifiers: ["Shift"] });
  const inspector = page.getByRole("region", { name: "Egenskaper för markerade hinder" });
  await expect(inspector).toContainText("2 hinder markerade");

  await inspector.getByRole("button", { name: "Justera vänster" }).click();
  await expect.poll(async () => (await obstacles(page)).find((o) => o.id === e)?.x).toBe(5);

  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect.poll(async () => (await obstacles(page)).length).toBe(8);
  const pasted = (await obstacles(page)).slice(-2);
  expect(pasted.map((o) => [o.x, o.y])).toEqual([[7, 22], [7, 32]]);

  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await obstacles(page)).slice(-2).map((o) => o.x)).toEqual([7.25, 7.25]);

  await page.keyboard.press("Delete");
  await expect.poll(async () => (await obstacles(page)).length).toBe(6);
});

test("markeringsruta, måttband och avståndsetiketter", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobil", "Shift-dra och kortkommandon är desktopflöden");
  await openWithCourse(page);

  // Shift-dra en ruta runt de tre första hoppen på rad.
  const from = await screenOf(page, 3.5, 18);
  const to = await screenOf(page, 18.5, 22);
  await page.keyboard.down("Shift");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const inspector = page.getByRole("region", { name: "Egenskaper för markerade hinder" });
  await expect(inspector).toContainText("3 hinder markerade");
  await expect(inspector.getByRole("button", { name: "Fördela vågrätt" })).toBeEnabled();

  // Måttband mellan hopp 1 (5,20) och hopp 4 (23,20) — snäpper mot mitten.
  await page.keyboard.press("Escape");
  await page.keyboard.press("m");
  const measureBanner = page.getByRole("status").filter({ hasText: /Dra mellan två punkter|Avstånd/ });
  await expect(measureBanner).toBeVisible();
  const p1 = await screenOf(page, 5.1, 20.1);
  const p2 = await screenOf(page, 22.9, 19.9);
  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y, { steps: 10 });
  await page.mouse.up();
  await expect(measureBanner).toContainText("18,00 m");
  await page.keyboard.press("Escape");
  await expect(measureBanner).toHaveCount(0);

  // Avstånd mellan hinder i banordning: 4 par, 6 m mellan hopp på rad.
  await page.keyboard.press("d");
  await expect(page.locator("[data-distance-label]")).toHaveCount(4);
  await expect(page.locator("[data-distance-label]").first()).toContainText("6,0 m");
});

test("egenskaper: exakt position, vinkel och plats i banordningen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobil", "Panelen är utfälld som standard på desktop");
  await openWithCourse(page);
  const b = await idAt(page, 11, 20);
  await badge(page, b).click();
  const inspector = page.getByRole("region", { name: "Egenskaper för markerade hinder" });
  await expect(inspector).toContainText("#2");

  await inspector.getByRole("textbox", { name: "X (m)" }).fill("12,5");
  await inspector.getByRole("textbox", { name: "X (m)" }).press("Enter");
  await expect.poll(async () => (await obstacles(page)).find((o) => o.id === b)?.x).toBe(12.5);

  await inspector.getByRole("textbox", { name: "Vinkel (°)" }).fill("-45");
  await inspector.getByRole("textbox", { name: "Vinkel (°)" }).press("Enter");
  await expect.poll(async () => (await obstacles(page)).find((o) => o.id === b)?.rotation).toBe(315);

  await inspector.getByRole("textbox", { name: "Nummer (#)" }).fill("5");
  await inspector.getByRole("textbox", { name: "Nummer (#)" }).press("Enter");
  await expect.poll(() => order(page)).toEqual(["5,20", "17,20", "23,20", "11,30", "12.5,20"]);
  await expect(inspector).toContainText("#5");
});

test("mobil: välj flera med tryck och numrera från dockan", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobil", "Pekflödet testas i mobilprojektet");
  await openWithCourse(page);
  const a = await idAt(page, 5, 20);
  const d = await idAt(page, 23, 20);

  await page.getByRole("button", { name: "Välj flera", exact: true }).click();
  await badge(page, a).click();
  await badge(page, d).click();
  await expect(page.getByRole("status").filter({ hasText: "2 markerade" })).toBeVisible();
  const inspector = page.getByRole("region", { name: "Egenskaper för markerade hinder" });
  await expect(inspector).toContainText("2 hinder markerade");
  // Ett tryck på ett markerat hinder tar bort det ur markeringen …
  await badge(page, a).click();
  await expect(page.getByRole("status").filter({ hasText: "1 markerade" })).toBeVisible();
  await badge(page, a).click();
  // … medan en dragning flyttar hela gruppen.
  const start = (await badge(page, a).boundingBox())!;
  const before = await obstacles(page);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  const target = await screenOf(page, 7, 24);
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const now = await obstacles(page);
      const moved = (id: string) => {
        const o0 = before.find((o) => o.id === id)!, o1 = now.find((o) => o.id === id)!;
        return [+(o1.x - o0.x).toFixed(2), +(o1.y - o0.y).toFixed(2)];
      };
      const [da, dd] = [moved(a), moved(d)];
      return da[1] > 0 && da[0] === dd[0] && da[1] === dd[1];
    })
    .toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "2 markerade" })).toBeVisible();
  await page.getByRole("button", { name: "Klar", exact: true }).click();

  await page.getByRole("button", { name: "Numrera", exact: true }).click();
  await badge(page, d).click();
  await expect(page.getByRole("status").filter({ hasText: "Klicka hinder" })).toContainText("#2");
  await page.getByRole("button", { name: "Klar", exact: true }).click();
  const dNow = (await obstacles(page)).find((o) => o.id === d)!;
  await expect.poll(async () => (await order(page))[0]).toBe(`${dNow.x},${dNow.y}`);
});
