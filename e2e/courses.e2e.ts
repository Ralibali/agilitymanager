import { test, expect, type Page } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

// Browser requests execute the real migration and permission checks in a local
// Postgres engine. No production data or real payment is used in these tests.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const dog = { id: "dog-rio", name: "Rio", sport: "agility", size: "M", agilityLevel: "Klass 1", hoopersLevel: "Startklass" };
let db: PGlite;
test.use({ actionTimeout: 10_000 });

async function value(sql: string, args: unknown[] = []) {
  return Object.values((await db.query(sql, args)).rows[0] as Record<string, unknown>)[0];
}
async function instructor(action: string, courseId: string | null, data = {}) {
  return value("select public.courses_instructor($1,$2,$3,$4,$5)", [id(1), id(101), action, courseId, data]);
}
async function participant(who: number, action: string, registrationId: string | null, data = {}) {
  return value("select public.courses_participant($1,$2,$3,$4,$5)", [id(who), id(100 + who), action, registrationId, data]);
}

async function connect(page: Page, who: number | null) {
  await page.addInitScript(({ who, id, token, dog }) => {
    localStorage.setItem("agilitymanager_ga4_consent_v2", JSON.stringify({ version: 2, analytics: false, updatedAt: new Date().toISOString() }));
    if (who) localStorage.setItem("am-planner-profile", JSON.stringify({ id, token, name: who === 1 ? "Instruktör Anna" : `Deltagare ${who}`, email: `person${who}@example.test` }));
    localStorage.setItem("am_match_dog_profiles", JSON.stringify({ profiles: [dog], activeId: dog.id }));
  }, { who, id: who ? id(who) : null, token: who ? id(100 + who) : null, dog });
  await page.route("**/rest/v1/rpc/courses_*", async (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
    if (route.request().method() === "OPTIONS") { await route.fulfill({ status: 204, headers: cors }); return; }
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const data = route.request().postDataJSON();
    try {
      const result = name === "courses_catalog"
        ? await value("select public.courses_catalog($1)", [data.p_id])
        : await value(`select public.${name}($1,$2,$3,$4,$5)`, [data.p_profile, data.p_token, data.p_action, data.p_id, data.p_data]);
      await route.fulfill({ json: result, headers: cors });
    } catch (error) {
      await route.fulfill({ status: 400, headers: cors, json: { code: "P0001", message: error instanceof Error ? error.message : String(error) } });
    }
  });
}

async function fitsMobile(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test.beforeEach(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.planner_profiles(id uuid primary key, edit_token uuid not null, name text not null, email text not null);
    insert into public.planner_profiles values
    ('${id(1)}','${id(101)}','Instruktör Anna','person1@example.test'),
    ('${id(2)}','${id(102)}','Deltagare 2','person2@example.test'),
    ('${id(3)}','${id(103)}','Deltagare 3','person3@example.test');
    grant usage on schema public to anon, authenticated, service_role;`);
  await db.exec(readFileSync("supabase/migrations/20261015133218_training_courses_mvp.sql", "utf8"));
  await db.exec("set role anon");
});

test.afterEach(async () => { await db.close(); });

// Scenarios are added below after the UI contract is available.

const futureDate = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
const courseData = {
  title: "Agility nybörjare", description: "Trygg grundträning för hund och förare tillsammans.",
  location: "Träningshallen, Linköping", sport: "agility", level: "Nybörjare", max_teams: 1,
  price_sek: 750, payment_instructions: "Betala till instruktören efter bekräftad plats. Avbokning senast 7 dagar före start.",
  sessions: [{ starts_at: `${futureDate}T17:00:00.000Z`, ends_at: `${futureDate}T18:00:00.000Z` }],
};
async function published() {
  const course = await instructor("save", id(10), courseData) as { revision: number };
  return instructor("publish", id(10), { revision: course.revision });
}

test("public course details show dates and capacity without participant data", async ({ page }) => {
  await published();
  await participant(2, "register", id(20), { course_id: id(10), dog, consent: true, phone: "0700000022" });
  await connect(page, null);
  await page.goto(`/kurser/${id(10)}`);
  await expect(page.getByRole("heading", { name: "Agility nybörjare", exact: true })).toBeVisible();
  await expect(page.getByText("Träningshallen, Linköping", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Öppna banprofil och anmäl dig" })).toBeVisible();
  await expect(page.getByText("person2@example.test")).toHaveCount(0);
  await expect(page.getByText("0700000022")).toHaveCount(0);
  await fitsMobile(page);
  await page.screenshot({ path: test.info().outputPath("course-detail.png"), fullPage: true });
});

test("saved dog joins waitlist, receives free place, cancels and erases own data", async ({ page }) => {
  await published();
  await participant(2, "register", id(20), { course_id: id(10), dog, consent: true });
  await connect(page, 3);
  await page.goto(`/kurser/${id(10)}`);
  await page.getByLabel("Hundprofil", { exact: false }).selectOption("dog-rio");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Ställ ekipaget på väntelistan", exact: true }).click();
  await expect(page.getByText("På väntelistan", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Du betalar först när du har fått en bekräftad plats.", { exact: false })).toBeVisible();
  await fitsMobile(page);
  const first = await value("select public.courses_participant($1,$2,'list')", [id(2), id(102)]) as { revision: number }[];
  await participant(2, "cancel", id(20), { course_id: id(10), revision: first[0].revision });
  await page.goto("/kurser?vy=anmalningar");
  await expect(page.getByText("Bekräftad plats", { exact: true })).toBeVisible();
  await expect(page.getByText("Att betala:", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Avanmäl ekipaget", exact: true }).click();
  await page.getByRole("button", { name: "Ja, avanmäl", exact: true }).click();
  await expect(page.getByText("Avanmäld", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Radera mina anmälningsuppgifter", exact: true }).click();
  await page.getByRole("button", { name: "Ja, radera uppgifterna", exact: true }).click();
  await expect(page.getByText("Du har inga kursanmälningar med den här banprofilen ännu.")).toBeVisible();
  expect(await value("select public.courses_participant($1,$2,'list')", [id(3), id(103)])).toEqual([]);
});

test("instructor creates and publishes a course from the existing design", async ({ page }) => {
  await connect(page, 1);
  await page.goto("/kurser?vy=instruktor");
  await page.getByRole("button", { name: "Skapa kurs", exact: true }).click();
  await page.getByLabel("Kursnamn", { exact: true }).fill("Hoopers helgkurs");
  await page.getByLabel("Om kursen", { exact: true }).fill("En helgkurs i hoopers för förare och hund med grunderna på plats.");
  await page.getByRole("combobox", { name: "Sport", exact: true }).selectOption("hoopers");
  await page.getByLabel("Nivå / förkunskaper", { exact: true }).fill("Startklass");
  await page.getByLabel("Träningsplats och adress", { exact: true }).fill("Hundhallen, Linköping");
  await page.getByLabel("Max antal ekipage", { exact: false }).fill("6");
  await page.getByLabel("Start", { exact: true }).fill(`${futureDate}T18:00`);
  await page.getByLabel("Slut", { exact: true }).fill(`${futureDate}T19:30`);
  await page.getByRole("button", { name: "Lägg till datum", exact: true }).click();
  const nextDay = new Date(Date.parse(futureDate) + 86400_000).toISOString().slice(0, 10);
  await page.getByLabel("Start", { exact: true }).nth(1).fill(`${nextDay}T18:00`);
  await page.getByLabel("Slut", { exact: true }).nth(1).fill(`${nextDay}T19:30`);
  await fitsMobile(page);
  await page.getByRole("button", { name: "Spara utkast", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hoopers helgkurs", exact: true })).toBeVisible();
  expect(await value("select public.courses_catalog()")).toEqual([]);
  await page.getByRole("button", { name: "Publicera kurs", exact: true }).click();
  await expect(page.getByText("Kursen är publicerad och öppen för anmälan.", { exact: true })).toBeVisible();
  const catalog = await value("select public.courses_catalog()") as { title: string; sessions: unknown[]; max_teams: number }[];
  expect(catalog).toMatchObject([{ title: "Hoopers helgkurs", max_teams: 6 }]);
  expect(catalog[0].sessions).toHaveLength(2);
  await page.getByRole("link", { name: "Öppna kurslänk", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Hoopers helgkurs", exact: true })).toBeVisible();
  await fitsMobile(page);
});

test("instructor records external payment, cancellation and refund", async ({ page }) => {
  await published();
  await participant(2, "register", id(20), { course_id: id(10), dog, consent: true });
  await connect(page, 1);
  await page.goto("/kurser?vy=instruktor");
  await page.getByRole("button", { name: "Hantera kurs", exact: true }).click();
  await expect(page.getByRole("link", { name: "person2@example.test", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Markera betald", exact: true }).click();
  await page.getByRole("button", { name: "Bekräfta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Markera ej betald", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Avanmäl ekipage", exact: true }).click();
  await page.getByRole("button", { name: "Bekräfta", exact: true }).click();
  await page.getByRole("button", { name: "Markera återbetald", exact: true }).click();
  await page.getByRole("button", { name: "Bekräfta", exact: true }).click();
  await expect(page.getByText("Återbetald", { exact: false }).first()).toBeVisible();
  const board = await instructor("view", id(10)) as { registrations: { payment_status: string; status: string; refund_due: boolean }[] };
  expect(board.registrations[0]).toMatchObject({ payment_status: "refunded", status: "cancelled", refund_due: false });
  await fitsMobile(page);
  await page.screenshot({ path: test.info().outputPath("course-instructor.png"), fullPage: true });
});

test("missing backend shows an actionable error without fake course content", async ({ page }) => {
  await connect(page, null);
  await page.route("**/rest/v1/rpc/courses_catalog", (route) => route.fulfill({ status: 404, headers: { "access-control-allow-origin": "*" }, json: { code: "PGRST202", message: "Could not find function" } }));
  await page.goto("/kurser");
  await expect(page.getByRole("alert")).toContainText("Kursbokningen är inte tillgänglig just nu");
  await expect(page.getByText("Agility nybörjare", { exact: true })).toHaveCount(0);
  await fitsMobile(page);
});
