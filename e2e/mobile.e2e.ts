import { expect, test, type Page } from "@playwright/test";

const PLANNER_KEY = "am-redesign-planner-v2";
const entry = process.env.AGILITY_MOBILE_ENTRY || "";
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
  await page.route("**/*", (request) => {
    const url = new URL(request.request().url());
    return url.origin === localOrigin ? request.continue() : request.abort("internetdisconnected");
  });
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
  await page.getByRole("link", { name: "Radera konto", exact: true }).last().click();
  await expect(page).toHaveURL(/#\/radera-konto$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/radera/i);
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Hoppa till innehållet" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/radera-konto$/);
  await expect(page.locator("#mobile-content")).toBeFocused();
  expect(analyticsRequests).toEqual([]);
  // Removed website-only screens must not expose the 0 kr pricing page in a
  // purchased planner app, including when opened through an old bookmark.
  await openMobile(page, "/priser");
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Ut på planen." })).toBeVisible();
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
  await navigation.getByRole("link", { name: "Banor", exact: true }).click();
  await navigation.getByRole("link", { name: "Rita", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: "Banans namn" })).toHaveValue(course.name);
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null")?.obstacles[0].rotation, PLANNER_KEY)).toBe(30);
  await expect(page.getByRole("status").filter({ hasText: "Du är offline" })).toBeVisible();
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
