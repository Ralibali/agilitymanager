import { expect, test, type Page } from "@playwright/test";

/**
 * Regressionstest för banplanerarens proffsverktyg: bangeneratorn,
 * förarplanen (förarlinje, markeringar, korsningar), övningar på samma
 * uppställning, smarta stödlinjer och delningslänkar med lagren.
 */

const STORAGE_KEY = "am-redesign-planner-v2";

type Ob = { id: string; type: string; x: number; y: number; rotation: number; number?: number };

const course = {
  version: 2,
  name: "Proffstest",
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

async function idAt(page: Page, x: number, y: number) {
  const ob = (await obstacles(page)).find((o) => Math.abs(o.x - x) < 0.01 && Math.abs(o.y - y) < 0.01);
  if (!ob) throw new Error(`Inget hinder på ${x},${y}`);
  return ob.id;
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

async function openPlanner(page: Page) {
  await page.goto("/banplanerare", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Endast nödvändiga", exact: true }).click();
  await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();
}

async function openWithCourse(page: Page) {
  await openPlanner(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "proffs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(course)),
  });
  await expect.poll(async () => (await draft(page))?.name).toBe(course.name);
  await expect.poll(async () => (await obstacles(page)).length).toBe(6);
}

async function drawStroke(page: Page, points: Array<[number, number]>) {
  const first = await screenOf(page, points[0][0], points[0][1]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) {
    const s = await screenOf(page, x, y);
    await page.mouse.move(s.x, s.y, { steps: 6 });
  }
  await page.mouse.up();
}

/** Knappar finns både i sidopanelen (dator) och i dockan (mobil) — ta den synliga. */
const visibleButton = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name }).filter({ visible: true }).first();

const layerButton = (page: Page, mobile: boolean, layer: "Hinder" | "Förarplan" | "Övningar") =>
  page.getByRole("group", { name: "Lager" }).getByRole("button", {
    name: mobile && layer === "Förarplan" ? "Förare" : layer,
  }).filter({ visible: true }).first();

test("generera bana: förhandsvisning, regelkontroll och ångra", async ({ page }) => {
  await openPlanner(page);
  await page.getByRole("button", { name: "Generera bana" }).first().click();
  const dialog = page.getByRole("dialog", { name: /Generera bana/ });
  await expect(dialog.getByText("Regelkontroll utan anmärkningar")).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole("combobox").selectOption("agility_2");
  await expect(dialog.getByText("Regelkontroll utan anmärkningar")).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole("button", { name: /Använd banan/ }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(async () => (await draft(page))?.classTemplate).toBe("agility_2");
  const placed = await obstacles(page);
  const competing = placed.filter((o) => !["start", "finish", "number", "handler_zone"].includes(o.type));
  expect(competing.length).toBeGreaterThanOrEqual(15);
  expect(competing.length).toBeLessThanOrEqual(22);
  await expect(page.getByRole("button", { name: /Regelkontroll — inga anmärkningar/ })).toBeVisible();

  // Hela genereringen är ETT ångra-steg.
  await page.getByRole("button", { name: "Ångra", exact: false }).first().click();
  await expect.poll(async () => (await obstacles(page)).length).toBe(0);
});

test("förarplan: rita förarlinje, korsningar, byte och anteckning", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobil";
  await openWithCourse(page);
  await layerButton(page, mobile, "Förarplan").click();
  await visibleButton(page, /^Förarlinje/).click();
  await expect(page.getByRole("status").filter({ hasText: "Rita förarens väg" })).toBeVisible();

  // En linje rakt över hundens väg (y = 20) mellan hopp 2 och 3 korsar den en gång.
  await drawStroke(page, [[14, 14], [14, 17], [14.2, 22], [14.4, 25]]);
  await expect.poll(async () => (await draft(page))?.markup?.strokes?.length).toBe(1);
  await expect(page.locator("[data-crossing]")).toHaveCount(1);

  await visibleButton(page, /^Framförbyte/).click();
  const fc = await screenOf(page, 14, 22);
  await page.mouse.click(fc.x, fc.y);
  await expect.poll(async () => (await draft(page))?.markup?.cues?.map((c: { kind: string }) => c.kind)).toEqual(["front_cross"]);

  await visibleButton(page, /^Anteckning/).click();
  const nt = await screenOf(page, 20, 30);
  await page.mouse.click(nt.x, nt.y);
  await page.getByRole("textbox", { name: "Anteckningens text" }).fill("Belöna efter 4");
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(page.locator('[data-cue="note"]')).toHaveCount(1);
  await page.keyboard.press("Escape");

  // Vald anteckning kan tas bort från åtgärdsraden — ett ångra-steg tar tillbaka den.
  await page.getByRole("button", { name: "Ta bort markeringen (Delete)" }).click();
  await expect(page.locator('[data-cue="note"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Ångra", exact: false }).first().click();
  await expect(page.locator('[data-cue="note"]')).toHaveCount(1);

  // Suddet tar bort förarlinjen.
  await visibleButton(page, /^Sudd/).click();
  const er = await screenOf(page, 14.3, 23.5);
  await page.mouse.click(er.x, er.y);
  await expect.poll(async () => (await draft(page))?.markup?.strokes?.length ?? 0).toBe(0);
  await expect(page.locator("[data-crossing]")).toHaveCount(0);

  // Förarplanen överlever omladdning.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await draft(page))?.markup?.cues?.length).toBe(2);
});

test("övningar: samma hinder flera gånger, egen linje och delningslänk", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobil";
  await openWithCourse(page);
  const a = await idAt(page, 5, 20);
  const b = await idAt(page, 11, 20);
  const e = await idAt(page, 11, 30);

  await layerButton(page, mobile, "Övningar").click();
  await visibleButton(page, /Ny övning/).click();
  const banner = page.getByRole("status").filter({ hasText: "Övning A" });
  await expect(banner).toContainText("steg 1");
  for (const [x, y] of [[5, 20], [11, 20], [11, 30], [11, 20], [5, 20]] as const) {
    const s = await screenOf(page, x, y);
    await page.mouse.click(s.x, s.y);
  }
  await expect(banner).toContainText("steg 6");
  await expect(page.locator('[data-exercise-badge="1·5"]')).toHaveCount(1);
  await expect(page.locator('[data-exercise-badge="2·4"]')).toHaveCount(1);
  await expect(page.locator('[data-run-line="exercise"]')).toHaveCount(1);
  await banner.getByRole("button", { name: "Klar", exact: true }).click();

  await expect.poll(async () => (await draft(page))?.exercises?.[0]?.steps).toEqual([a, b, e, b, a]);

  // Huvudbanan är orörd och visas igen.
  await page.getByRole("button", { name: "Huvudbanan", exact: true }).first().click();
  await expect(page.locator('[data-run-line="course"]')).toHaveCount(1);
  await expect(page.locator("[data-number-badge]")).toHaveCount(5);

  // Delningslänken bär med sig övningen (hinder-id:n byts ut i länken).
  await page.getByRole("button", { name: mobile ? "Fler verktyg" : "Dela banan via länk" }).first().click();
  if (mobile) await page.getByRole("menuitem", { name: "Dela via länk" }).click();
  const link = await page.getByRole("textbox", { name: "Delningslänk" }).inputValue();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ""), { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();
  await layerButton(page, mobile, "Övningar").click();
  await visibleButton(page, mobile ? /Övning A/ : "Visa Övning A").click();
  await expect(page.locator('[data-exercise-badge="1·5"]')).toHaveCount(1);
  await expect(page.locator('[data-exercise-badge="2·4"]')).toHaveCount(1);
});

test("stödlinjer och live-avstånd när ett hinder dras", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobil", "Musdragning med stödlinjer testas på desktop");
  await openWithCourse(page);
  const e = await idAt(page, 11, 30);

  // Dra hopp 5 mot x ≈ 17,1 — det snäpper i linje med hopp 3 (x = 17).
  const from = await screenOf(page, 11, 30);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const mid = await screenOf(page, 15, 31);
  await page.mouse.move(mid.x, mid.y, { steps: 6 });
  const to = await screenOf(page, 17.08, 31.12);
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await expect(page.locator('[data-guide="x"]')).toHaveCount(1);
  // Avstånd till föregående hinder syns medan hindret dras, utan att D är på.
  await expect(page.locator("[data-distance-label]")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator("[data-guide]")).toHaveCount(0);
  await expect(page.locator("[data-distance-label]")).toHaveCount(0);
  await expect.poll(async () => (await obstacles(page)).find((o) => o.id === e)?.x).toBe(17);
});
