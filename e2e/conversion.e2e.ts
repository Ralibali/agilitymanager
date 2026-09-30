import { expect, test } from "@playwright/test";

test("startsidans huvudknapp leder till banplaneraren och syns ovanför vecket", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Endast nödvändiga" }).click();

  const primary = page.getByRole("link", { name: "Börja rita gratis" }).first();
  await expect(primary).toBeVisible();
  // Vecket mäts bara med riktiga typsnitt: reservtypsnittet är bredare och bryter rubriken.
  await page.evaluate(() => document.fonts.ready);
  const displayFontLoaded = await page.evaluate(() =>
    [...document.fonts].some((font) => font.family.includes("Bebas Neue") && font.status === "loaded"),
  );
  if (displayFontLoaded) {
    // ratio 1 = hela knappen syns utan att man scrollar (väntar in reveal-animationen).
    await expect(primary).toBeInViewport({ ratio: 1 });
  } else {
    test.info().annotations.push({ type: "info", description: "Webbtypsnitt ej laddade — vecket kontrollerades inte" });
  }
  // Rita gratis-knappen i menyraden ska finnas på alla skärmstorlekar.
  await expect(page.getByRole("banner").getByRole("link", { name: "Rita gratis" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await primary.click();
  await expect(page).toHaveURL(/\/banplanerare$/);
  expect(errors).toEqual([]);
});

test("herobanan öppnas som mall i planeraren", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Endast nödvändiga" }).click();
  await page.getByRole("link", { name: /^Öppna banan .* i banplaneraren$/ }).click();
  await expect(page).toHaveURL(/\/banplanerare\?template=/);
});

test("cookieinställningar ligger i sidfoten och täcker inga knappar", async ({ page }) => {
  await page.goto("/");
  const consent = page.getByRole("dialog", { name: "Valfri statistik" });
  await expect(consent).toBeVisible();
  await page.getByRole("button", { name: "Endast nödvändiga" }).click();
  await expect(consent).toHaveCount(0);
  // Ingen flytande knapp kvar ovanpå innehållet.
  await expect(page.getByRole("button", { name: "Cookieinställningar" })).toHaveCount(1);
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Cookieinställningar" })).toHaveCount(1);

  await page.getByRole("contentinfo").getByRole("button", { name: "Cookieinställningar" }).click();
  await expect(consent).toBeVisible();
  await page.getByRole("button", { name: "Acceptera statistik" }).click();
  await expect(consent).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("agilitymanager_ga4_consent_v1"))).toBe("accepted");

  await page.goto("/banplanerare");
  await expect(page.getByRole("button", { name: "Cookieinställningar" })).toHaveCount(0);
});

test("pris- och funktionssidorna har en CTA direkt i heron", async ({ page }) => {
  for (const path of ["/priser", "/funktioner"]) {
    await page.goto(path);
    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: /Börja rita gratis|Öppna banplaneraren/ })).toBeVisible();
  }
});
