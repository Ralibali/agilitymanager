import { expect, test } from "@playwright/test";

test("editing and deleting keep each result tied to its dog", async ({ page }) => {
  await page.addInitScript(() => {
    const baseProfile = { sport: "agility", agilityLevel: "Klass 1", hoopersLevel: "Startklass", size: "M" };
    localStorage.setItem("am_match_dog_profiles", JSON.stringify({
      profiles: [{ ...baseProfile, id: "dog-rio", name: "Rio" }, { ...baseProfile, id: "dog-luna", name: "Luna" }],
      activeId: "dog-rio",
    }));
    localStorage.setItem("am_dog_results", JSON.stringify({
      meritTarget: 3,
      results: [{
        id: "run-rio", dogId: "dog-rio", date: "2026-09-01", competitionName: "Rios tävling",
        discipline: "agility", level: "Klass 1", faults: 0, disqualified: false, timeSec: 35,
        placement: 2, starters: 12, merit: true, updatedAt: 1,
      }],
    }));
  });

  await page.goto("/resultat", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Endast nödvändiga", exact: true }).click();
  await page.getByRole("button", { name: "Ändra loppet Rios tävling 2026-09-01", exact: true }).click();
  await page.getByLabel("Tävling", { exact: true }).fill("Osparad ändring");
  await page.getByRole("button", { name: "Luna", exact: true }).click();
  await expect(page.getByRole("button", { name: "Spara ändringar", exact: true })).toHaveCount(0);
  await expect(page.getByText("Inga lopp loggade för Luna än.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_dog_results")!).results)).toMatchObject([
    { id: "run-rio", dogId: "dog-rio", competitionName: "Rios tävling" },
  ]);

  await page.getByRole("button", { name: "Logga lopp", exact: true }).click();
  await page.getByLabel("Tävling", { exact: true }).fill("Lunas tävling");
  await page.getByRole("button", { name: "Spara loppet", exact: true }).click();
  await expect(page.getByText("Lunas tävling", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("am_dog_results")!).results);
  expect(saved).toHaveLength(2);
  expect(saved.find((run: { id: string }) => run.id === "run-rio")).toMatchObject({ dogId: "dog-rio", competitionName: "Rios tävling" });
  expect(saved.find((run: { competitionName: string }) => run.competitionName === "Lunas tävling")).toMatchObject({ dogId: "dog-luna" });

  await page.getByRole("button", { name: "Rio", exact: true }).click();
  await page.getByRole("button", { name: "Ändra loppet Rios tävling 2026-09-01", exact: true }).click();
  await page.getByLabel("Tävling", { exact: true }).fill("Rios uppdaterade tävling");
  // Simulera att aktiv hund ändras i en annan flik medan formuläret är öppet.
  await page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem("am_match_dog_profiles")!);
    localStorage.setItem("am_match_dog_profiles", JSON.stringify({ ...profiles, activeId: "dog-luna" }));
    window.dispatchEvent(new Event("storage"));
  });
  await expect(page.getByRole("button", { name: "Luna", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Spara ändringar", exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_dog_results")!).results.find((run: { id: string }) => run.id === "run-rio")))
    .toMatchObject({ id: "run-rio", dogId: "dog-rio", competitionName: "Rios uppdaterade tävling" });

  await page.getByRole("button", { name: "Rio", exact: true }).click();
  await page.getByRole("button", { name: "Ändra loppet Rios uppdaterade tävling 2026-09-01", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Ta bort loppet Rios uppdaterade tävling 2026-09-01", exact: true }).click();
  await expect(page.getByRole("button", { name: "Spara ändringar", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("am_dog_results")!).results.some((run: { id: string }) => run.id === "run-rio"))).toBe(false);
});
