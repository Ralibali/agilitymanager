import { expect, test, type Page } from "@playwright/test";

const PLANNER_KEY = "am-redesign-planner-v2";
const entry = process.env.AGILITY_MOBILE_ENTRY || "";
let externalRequests: string[] = [];
const course = {
  version: 2,
  name: "Mobiltest – lokal bana",
  sport: "hoopers",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  ruleSetId: "hoopers-fci-2026",
  classTemplate: "hoopers_fci_h2",
  obstacles: [{ id: "t", type: "tunnel", x: 15, y: 20, rotation: 30, number: 1, curveDeg: 90, curveSide: "left" }],
};

async function openMobile(page: Page, route = "/") {
  await page.goto(`/${entry}#${route}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("navigation", { name: "Appens huvudmeny" })).toBeVisible();
}

async function importCourse(page: Page) {
  await openMobile(page, "/banplanerare");
  await page.locator('input[type="file"]').setInputFiles({
    name: "mobile-course.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(course)),
  });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(course.name);
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null")?.name, PLANNER_KEY)).toBe(course.name);
}

test.beforeEach(async ({ page, baseURL }) => {
  // Tests never reach a production service. Packaged assets remain available
  // from the local origin, as they do in a native WebView without internet.
  const localOrigin = new URL(baseURL!).origin;
  externalRequests = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== localOrigin) externalRequests.push(request.url());
  });
  await page.route("**/*", (request) => {
    const url = new URL(request.request().url());
    return url.origin === localOrigin ? request.continue() : request.abort("internetdisconnected");
  });
});

test.afterEach(() => {
  expect(externalRequests, "The standalone app must not request an auth, community or analytics service").toEqual([]);
});

test("mobile navigation, legal routes and Capacitor safe-area values work", async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics/.test(request.url())) analyticsRequests.push(request.url());
  });
  await openMobile(page);
  await expect(page.getByRole("heading", { name: "Ut på planen." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Öppna banplaneraren", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Valfri statistik" })).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "Appens huvudmeny" });
  await expect(navigation.getByRole("link")).toHaveCount(3);
  await expect(navigation.getByRole("link", { name: "Rita", exact: true })).toBeVisible();
  await expect(navigation).not.toContainText(/Tävlingar|Träning/);
  for (const link of await navigation.getByRole("link").all()) {
    const bounds = await link.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-area-inset-top", "24px");
    document.documentElement.style.setProperty("--safe-area-inset-bottom", "20px");
  });
  await expect.poll(() => page.locator(".mobile-header").evaluate((element) => getComputedStyle(element).paddingTop)).toBe("24px");
  await expect.poll(() => navigation.evaluate((element) => getComputedStyle(element).paddingBottom)).toBe("20px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await navigation.getByRole("link", { name: "Banor", exact: true }).click();
  await expect(page).toHaveURL(/#\/banor$/);
  await expect(navigation.getByRole("link", { name: "Banor", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("body")).not.toContainText(/Allt är gratis|Planera träning med banan/);
  await page.getByRole("link", { name: "Integritet", exact: true }).last().click();
  await expect(page).toHaveURL(/#\/integritet$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/integritet/i);
  await expect(page.getByRole("link", { name: "Support", exact: true })).toHaveAttribute("href", "mailto:info@auroramedia.se");
  await expect(page.getByRole("link", { name: "Radera konto", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Konto", exact: true })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Hoppa till innehållet" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/integritet$/);
  await expect(page.locator("#mobile-content")).toBeFocused();
  expect(analyticsRequests).toEqual([]);
  // Removed website-only screens must not expose the 0 kr pricing page in a
  // purchased planner app, including when opened through an old bookmark.
  for (const route of ["/priser", "/auth", "/delade-banor", "/bana/123", "/radera-konto"]) {
    await openMobile(page, route);
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "Ut på planen." })).toBeVisible();
  }
});

test("offline users can save a local course and reopen the planner", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false });
  });
  await importCourse(page);
  await expect(page.getByRole("status").filter({ hasText: "Du är offline" })).toBeVisible();
  await page.getByRole("button", { name: /^Bana-meny/ }).click();
  await page.getByRole("menuitem", { name: /^Spara bana/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses") || "[]")[0]?.name)).toBe(course.name);

  const navigation = page.getByRole("navigation", { name: "Appens huvudmeny" });
  const savedId = await page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses") || "[]")[0].id);
  await navigation.getByRole("link", { name: "Mitt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mina banor", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Öppna", exact: true }).click();
  await expect(page).toHaveURL(/#\/banplanerare\?local=/);
  await page.getByRole("textbox", { name: "Banans namn" }).fill("Uppdaterad mobilbana");
  await page.getByRole("button", { name: /^Bana-meny/ }).click();
  await page.getByRole("menuitem", { name: /^Spara bana/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses") || "[]"))).toMatchObject([{ id: savedId, name: "Uppdaterad mobilbana" }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses") || "[]").length)).toBe(1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue("Uppdaterad mobilbana");
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null")?.obstacles[0].rotation, PLANNER_KEY)).toBe(30);
  await expect(page.getByRole("status").filter({ hasText: "Du är offline" })).toBeVisible();
});

test("leaving the planner preserves edits before the autosave delay", async ({ page }) => {
  // Install before loading the page, then pause after the initial import has
  // autosaved. No debounce timer can run while the draft is edited or reopened.
  await page.clock.install({ time: new Date("2026-10-01T12:00:00Z") });
  await importCourse(page);
  await page.clock.pauseAt(new Date("2026-10-01T12:01:00Z"));
  const pausedAt = await page.evaluate(() => Date.now());
  const updatedName = "Utkast sparat vid sidbyte";
  await page.getByRole("textbox", { name: "Banans namn" }).fill(updatedName);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.name, PLANNER_KEY)).toBe(course.name);

  // Hash navigation avoids actionability checks that need animation frames
  // while Playwright's clock is paused. No explicit Save action is used.
  await page.evaluate(() => { window.location.hash = "/mina-banor"; });
  await expect(page.getByRole("heading", { name: "Mina banor", exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.name, PLANNER_KEY)).toBe(updatedName);
  await page.evaluate(() => { window.location.hash = "/banplanerare"; });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(updatedName);
  expect(await page.evaluate(() => Date.now())).toBe(pausedAt);
});

test("a new local-course link opens the right course in an already-open planner", async ({ page }) => {
  await page.addInitScript(courseData => {
    localStorage.setItem("am_planner_local_courses", JSON.stringify([
      { id: "first", name: "Första banan", sport: "hoopers", obstacleCount: 1, updatedAt: "2026-10-01T10:00:00Z", data: { ...courseData, name: "Första banan" } },
      { id: "second", name: "Andra banan", sport: "hoopers", obstacleCount: 1, updatedAt: "2026-10-01T10:00:00Z", data: { ...courseData, name: "Andra banan" } },
    ]));
  }, course);
  await openMobile(page, "/banplanerare?local=first");
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue("Första banan");
  await page.evaluate(() => { window.location.hash = "/banplanerare?local=second"; });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue("Andra banan");
});

test("local course deletion requires a choice and leaves the current draft intact", async ({ page }) => {
  await importCourse(page);
  await page.getByRole("button", { name: /^Bana-meny/ }).click();
  await page.getByRole("menuitem", { name: /^Spara bana/ }).click();
  await page.getByRole("navigation", { name: "Appens huvudmeny" }).getByRole("link", { name: "Mitt", exact: true }).click();
  await page.getByRole("button", { name: `Radera ${course.name}`, exact: true }).click();
  await page.getByRole("button", { name: "Avbryt", exact: true }).click();
  await expect(page.getByRole("heading", { name: course.name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Radera ${course.name}`, exact: true }).click();
  await page.getByRole("button", { name: "Radera sparad bana", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inga sparade banor än", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_planner_local_courses") || "[]"))).toEqual([]);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null")?.name, PLANNER_KEY)).toBe(course.name);
});

test("mobile JSON export preserves the imported local course", async ({ page }) => {
  await importCourse(page);
  await page.getByRole("button", { name: "Ladda ner eller exportera bana", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportera JSON", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toMatchObject({
    version: 2,
    name: course.name,
    ruleSetId: course.ruleSetId,
    classTemplate: course.classTemplate,
    obstacles: [expect.objectContaining({ type: "tunnel", rotation: 30, curveDeg: 90, curveSide: "left" })],
  });
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

test("3D uses a packaged font offline and returns to the same planner", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await importCourse(page);
  const fontResponse = page.waitForResponse(response => /\/Archivo[^/]*\.ttf$/.test(new URL(response.url()).pathname) && response.ok());
  await page.getByRole("button", { name: "Fler verktyg", exact: true }).click();
  await page.getByRole("menuitem", { name: /^3D-vy/ }).click();
  const scene = page.getByRole("dialog", { name: `3D-vy av ${course.name}`, exact: true });
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toBeVisible();
  await fontResponse;
  await page.screenshot({ path: testInfo.outputPath("offline-3d.png") });
  await page.keyboard.press("Escape");
  await expect(scene).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(course.name);
  expect(errors).toEqual([]);
});
