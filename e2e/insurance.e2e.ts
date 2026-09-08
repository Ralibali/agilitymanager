import { expect, test } from "@playwright/test";
test("insurance comparison loads from its alias and filters without losing source links", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/j%C3%A4mf%C3%B6r-f%C3%B6rs%C3%A4krings");
  await expect(page).toHaveURL(/\/jamfor-hundforsakring$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jämför hundförsäkring för ett aktivt hundliv");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://agilitymanager.se/jamfor-hundforsakring");
  await expect(page.getByRole("article")).toHaveCount(3);
  for (const name of ["Lassie", "Petson", "Svedea"]) await page.getByRole("checkbox", { name, exact: true }).uncheck();
  await expect(page.getByText("Välj minst en aktör för att visa jämförelsen.")).toBeVisible();
  await page.getByRole("button", { name: "Visa alla", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Källa: Petson", exact: true })).toHaveAttribute("href", "https://www.petson.se/hundforsakring");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("insurance.png"), fullPage: true, animations: "disabled" });
  // Hamburgermenyn visas under lg-breakpointen (1024px). Desktop-projektet
  // körs bredare än så, så vi krymper fönstret för att testa mobilmenyn och
  // återställer bredden längre ner när huvudmenyn ska kontrolleras.
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 900, height: 1000 });
  await page.getByRole("button", { name: "Öppna meny" }).click();
  await expect(page.getByRole("dialog", { name: "Meny", exact: true })).toHaveCSS("opacity", "1");
  await expect(page.getByRole("navigation", { name: "Mobilmeny" }).getByRole("link", { name: "Hundförsäkring", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("navigation.png"), animations: "disabled" });
  await page.getByRole("navigation", { name: "Mobilmeny" }).getByRole("link", { name: "Hundförsäkring", exact: true }).click();
  await expect(page.locator('[role="dialog"][aria-label="Meny"]')).toHaveCSS("opacity", "0");
  await expect(page.locator('[role="dialog"][aria-label="Meny"]')).toHaveAttribute("inert", "");
  await expect(page.getByRole("dialog", { name: "Meny", exact: true })).toHaveCount(0);
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.getByRole("navigation", { name: "Huvudmeny" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("navigation-wide.png"), animations: "disabled" });
  }
  expect(errors).toEqual([]);
});

test("ads use only approved site links and do not cover the planner", async ({ page }, testInfo) => {
  // Intercept only the development data module. No test advertiser is saved to production data.
  const partner = {
    id: "lassie", name: "Testpartner", channelId: "2103592373", programId: "fixture",
    status: "approved", verifiedAt: "2026-09-07", destination: "https://example.com",
    bannerUrl: "https://example.com/t/t?as=2103592373&epi=sitewide-banner",
    insuranceUrl: "https://example.com/t/t?as=2103592373&epi=jamfor-hundforsakring",
    description: "Testannons",
  };
  await page.route("**/src/content/affiliate-partners.json*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `export default ${JSON.stringify([partner, { ...partner, id: "pending", status: "pending" }, { ...partner, id: "other-channel", channelId: "2056181186" }])}`,
  }));
  for (const path of ["/", "/blogg", "/tavlingar", "/jamfor-hundforsakring", "/banplanerare", "/does-not-exist"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    const ad = page.getByRole("complementary", { name: "Annons från våra partners" });
    await expect(ad).toHaveCount(1);
      await expect(ad).toBeVisible();
      await expect(ad.getByRole("link")).toHaveCount(1);
      await expect(ad.getByRole("link")).toHaveAttribute("rel", /sponsored/);
      await expect(ad.getByRole("link")).toHaveAttribute("href", partner.bannerUrl);
      if (path === "/jamfor-hundforsakring") {
        await expect(page.getByText("Annonsinformation:", { exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: /Se pris hos Lassie/ })).toHaveAttribute("href", partner.insuranceUrl);
        await expect(page.getByRole("link", { name: /Se pris hos Lassie/ })).toHaveAttribute("rel", /sponsored/);
      }
      if (path === "/banplanerare") {
        const adBox = await ad.boundingBox();
        const headerBox = await page.locator("header").boundingBox();
        expect(adBox).not.toBeNull();
        expect(headerBox).not.toBeNull();
        expect(adBox!.y + adBox!.height).toBeLessThanOrEqual(headerBox!.y + 1);
        await page.screenshot({ path: testInfo.outputPath("planner-with-test-ad.png") });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
