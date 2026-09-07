import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { pgcrypto } });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let checks = 0;
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create extension pgcrypto with schema extensions;create table public.planner_profiles(id uuid primary key,edit_token uuid,name text);insert into public.planner_profiles values('${id(1)}','${id(101)}','Instruktör A'),('${id(2)}','${id(102)}','Instruktör B');grant usage on schema public,extensions to anon,authenticated,service_role;`,
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20260907162533_instructor_groups_and_feedback.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec("set role anon");
const val = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const own = (act, i = null, data = {}, who = 1) =>
  val("select public.coaching_instructor($1,$2,$3,$4,$5)", [
    id(who),
    id(100 + who),
    act,
    i,
    data,
  ]);
const student = (token, act = "view", i = null, data = {}) =>
  val("select public.coaching_student($1,$2,$3,$4)", [token, act, i, data]);
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const fail = async (fn, rx) => {
  await assert.rejects(fn, rx);
  checks++;
};
await fail(
  () => db.query("select * from coaching_groups"),
  /permission denied/,
);
await fail(
  () => db.query("select coaching_history($1,null,null)", [id(10)]),
  /permission denied/,
);
await fail(
  () => val("select coaching_instructor($1,$2,$3)", [id(1), id(102), "list"]),
  /verifieras/,
);
let g = await own("create_group", id(10), { name: "Onsdag" });
eq(g.name, "Onsdag");
eq((await own("create_group", id(10), { name: "Onsdag" })).id, g.id);
await fail(
  () => own("create_group", id(10), { name: "Ändrad" }),
  /redan sparats/,
);
eq((await own("list")).length, 1);
eq((await own("list", null, {}, 2)).length, 0);
await own("create_group", id(20), { name: "Privat grupp" }, 2);
await fail(() => own("view", id(10), {}, 2), /saknas/);
let s1 = await own("create_student", id(30), {
    group_id: g.id,
    name: "Eva",
    dog: "Fido",
  }),
  s2 = await own("create_student", id(31), {
    group_id: g.id,
    name: "Olle",
    dog: "Luna",
  }),
  s3 = await own(
    "create_student",
    id(40),
    { group_id: id(20), name: "Annan" },
    2,
  );
eq(s1.token.length, 64);
eq(Object.hasOwn(s1, "token_hash"), false);
eq(
  Object.hasOwn(
    await own("create_student", id(30), {
      group_id: g.id,
      name: "Eva",
      dog: "Fido",
    }),
    "token",
  ),
  false,
);
await fail(
  () =>
    own(
      "create_student",
      id(30),
      { group_id: id(20), name: "Eva", dog: "Fido" },
      2,
    ),
  /redan sparats/,
);
const task = {
  group_id: g.id,
  title: "Framförbyte",
  goal: "Träna lugnt",
  due_date: "2026-09-20",
  student_id: null,
  course: { name: "Bana A", href: "/banplanerare?template=agility_1" },
};
let a = await own("create_assignment", id(50), task);
eq(a.title, task.title);
eq((await own("create_assignment", id(50), task)).id, a.id);
await fail(
  () => own("create_assignment", id(50), { ...task, goal: "Ny" }),
  /redan sparats/,
);
await fail(
  () => own("create_assignment", id(51), { ...task, student_id: s3.id }),
  /saknas/,
);
await fail(
  () =>
    own("create_assignment", id(51), {
      ...task,
      course: { name: "X", href: "javascript:alert(1)" },
    }),
  /Välj en bana/,
);
await fail(
  () =>
    own("create_assignment", id(51), {
      ...task,
      course: { name: "X", href: "//evil.test/banplanerare?bana=x" },
    }),
  /Välj en bana/,
);
let privateTask = await own("create_assignment", id(52), {
  ...task,
  title: "Evas uppgift",
  student_id: s1.id,
  course: { name: "Sparad bana", href: "/banplanerare?bana=abc_def-123" },
});
eq((await student(s1.token)).assignments.length, 2);
eq((await student(s2.token)).assignments.length, 1);
eq((await student(s3.token)).assignments.length, 0);
eq(Object.hasOwn(await student(s1.token), "students"), false);
const report = {
  assignment_id: a.id,
  reflection: "Svårt vid sista hindret",
  video_url: "https://vimeo.com/123",
  completed: false,
  reviewed: true,
};
await fail(
  () => student(s1.token, "submit", id(60), { ...report, reviewed: false }),
  /Granska/,
);
await fail(
  () =>
    student(s2.token, "submit", id(60), {
      ...report,
      assignment_id: privateTask.id,
    }),
  /saknas/,
);
await fail(
  () =>
    student(s1.token, "submit", id(60), {
      ...report,
      video_url: "https://user:pass@evil.test/x",
    }),
  /videolänk/,
);
await fail(
  () =>
    student(s1.token, "submit", id(60), {
      ...report,
      video_url: "javascript:alert(1)",
    }),
  /videolänk/,
);
let r = await student(s1.token, "submit", id(60), report);
eq(r.reflection, report.reflection);
eq((await student(s1.token, "submit", id(60), report)).id, r.id);
await fail(
  () =>
    student(s1.token, "submit", id(60), { ...report, reflection: "Ändrad" }),
  /redan sparats/,
);
eq((await student(s2.token)).submissions.length, 0);
eq((await student(s1.token)).submissions.length, 1);
const feedback = {
  group_id: g.id,
  submission_id: r.id,
  body: "Bra början",
  next_step: "Titta framåt",
  video_seconds: 84,
};
await fail(
  () => own("feedback", id(70), { ...feedback, group_id: id(20) }, 2),
  /saknas/,
);
await fail(
  () => own("feedback", id(70), { ...feedback, video_seconds: 21601 }),
  /tidsmarkeringen/,
);
let f = await own("feedback", id(70), feedback);
eq(f.video_seconds, 84);
eq((await own("feedback", id(70), feedback)).id, f.id);
await fail(
  () => own("feedback", id(70), { ...feedback, body: "Annat" }),
  /annat innehåll/,
);
eq((await student(s1.token)).feedback.length, 1);
eq((await student(s2.token)).feedback.length, 0);
eq((await own("view", g.id)).progress[0].reviewed, true);
await student(s1.token, "submit", id(61), {
  ...report,
  reflection: "Andra försöket",
  completed: true,
});
let b = await own("view", g.id);
eq(b.progress[0].reviewed, false);
eq(b.progress[0].completed, true);
await fail(
  () => db.query("update coaching_submissions set completed=true"),
  /permission denied/,
);
const firstToken = s1.token;
s1 = await own("rotate_student", s1.id, {
  group_id: g.id,
  revision: s1.revision,
});
await fail(() => student(firstToken), /giltig längre/);
eq((await student(s1.token)).submissions.length, 2);
await fail(
  () => own("disable_student", s1.id, { group_id: g.id, revision: 1 }),
  /ändrats/,
);
let disabled = await own("disable_student", s1.id, {
  group_id: g.id,
  revision: s1.revision,
});
eq(disabled.active, false);
await fail(() => student(s1.token), /giltig längre/);
s1 = await own("rotate_student", s1.id, {
  group_id: g.id,
  revision: disabled.revision,
});
eq((await student(s1.token)).feedback.length, 1);
a = await own("archive_assignment", a.id, {
  group_id: g.id,
  revision: a.revision,
  archived: true,
});
await fail(() => student(s1.token, "submit", id(62), report), /stängd/);
eq((await student(s1.token)).submissions.length, 2);
g = await own("archive_group", g.id, { revision: g.revision, archived: true });
eq((await student(s1.token)).group.archived, true);
await fail(() => own("feedback", id(71), feedback), /arkiverad/);
await fail(() => student(s1.token, "submit", id(62), report), /arkiverad/);
disabled = await own("disable_student", s1.id, {
  group_id: g.id,
  revision: s1.revision,
});
eq(disabled.active, false);
g = await own("archive_group", g.id, { revision: g.revision, archived: false });
s1 = await own("rotate_student", s1.id, {
  group_id: g.id,
  revision: disabled.revision,
});
await db.exec("reset role");
await db.query(
  "update coaching_students set expires_at=now()-interval '1 hour' where id=$1",
  [s1.id],
);
await db.exec("set role anon");
await fail(() => student(s1.token), /giltig längre/);
// Pagination deliberately uses equal timestamps to exercise the (timestamp,id) cursor.
await db.exec("reset role");
for (let n = 0; n < 105; n++)
  await db.query(
    "insert into coaching_submissions values($1,$2,$3,$4,'',false,'2026-09-01T12:00:00Z')",
    [id(1000 + n), a.id, s2.id, "Historik " + n],
  );
await db.exec("set role anon");
const page1 = await student(s2.token);
eq(page1.submissions.length, 100);
assert.ok(page1.next_cursor);
checks++;
const page2 = await student(s2.token, "view", null, {
  before: page1.next_cursor,
});
eq(page2.submissions.length, 5);
eq(
  new Set([...page1.submissions, ...page2.submissions].map((x) => x.id)).size,
  105,
);
eq(page2.next_cursor, null);
const ownerPage = await own("view", g.id);
eq(ownerPage.submissions.length, 100);
eq(ownerPage.progress.length, 2);
eq(Object.hasOwn(ownerPage.students[0], "token_hash"), false);
eq(Object.hasOwn(ownerPage.students[0], "token"), false);
await db.close();
console.log(`PASS: ${checks} coaching database checks.`);
