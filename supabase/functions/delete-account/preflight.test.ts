import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const USER = "00000000-0000-4000-8000-000000000001";
const SESSION = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";
const SQL = readFileSync(new URL("./preflight.sql", import.meta.url), "utf8");
const check = async (db: PGlite, session = SESSION) => (await db.query<{ result: string }>(
  "select public.account_deletion_preflight($1,$2) as result", [USER, session],
)).rows[0].result;

async function fixture(extra = "") {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create table storage.objects(id integer primary key,owner_id text);
    create table public.profiles(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade);
    create table public.saved_courses(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade);
    create table public.course_comments(id integer primary key,course_id uuid references public.saved_courses(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade);
    grant usage on schema public,auth,storage to service_role;
    grant select on storage.objects to service_role;
    insert into auth.users values('${USER}'),('${OTHER}');
    insert into auth.sessions values('${SESSION}','${USER}');
    insert into public.profiles values('${USER}','${USER}'),('${OTHER}','${OTHER}');
    insert into public.saved_courses values('${USER}','${USER}'),('${OTHER}','${OTHER}');
    insert into public.course_comments values(1,'${USER}','${USER}'),(2,'${OTHER}','${OTHER}');
    ${extra}`);
  await db.exec(SQL);
  return db;
}

// PGlite initializes a WASM database per fixture; parallel app checks can make startup exceed five seconds.
describe("live-schema preflight SQL", { timeout: 30_000 }, () => {
  it("verifies cascades in a local database and leaves another account intact", async () => {
    const db = await fixture();
    try {
      await db.exec("set role service_role");
      expect(await check(db)).toBe("ready");
      await db.exec("reset role");
      await db.query("delete from auth.users where id=$1", [USER]);
      expect((await db.query("select * from public.profiles")).rows).toHaveLength(1);
      expect((await db.query("select * from public.saved_courses")).rows).toHaveLength(1);
      expect((await db.query("select * from public.course_comments")).rows).toEqual([{ id: 2, course_id: OTHER, user_id: OTHER }]);
      expect((await db.query("select * from auth.sessions")).rows).toHaveLength(0);
    } finally { await db.close(); }
  });
  it.each([
    "create table public.dog_match_profiles(user_id uuid primary key,store jsonb);",
    "create table public.other_comments(id integer,course_id uuid references public.saved_courses(id));",
    "create table public.other_accounts(user_id uuid references auth.users(id) on delete set null);",
    `insert into storage.objects values(1,'${USER}');`,
  ])("blocks incomplete cascade, orphan-prone identity columns or owned storage", async extra => {
    const db = await fixture(extra);
    try {
      await db.exec("set role service_role");
      expect(await check(db)).toBe("not_ready");
      await db.exec("reset role");
      expect((await db.query("select * from auth.users")).rows).toHaveLength(2);
    } finally { await db.close(); }
  });
  it("requires the active session to belong to the verified account", async () => {
    const db = await fixture();
    try {
      expect(await check(db, OTHER)).toBe("inactive_session");
      await db.query("update auth.sessions set user_id=$1 where id=$2", [OTHER, SESSION]);
      expect(await check(db)).toBe("inactive_session");
    } finally { await db.close(); }
  });
  it.each(["anon", "authenticated"])("never allows the %s role to call privileged preflight", async role => {
    const db = await fixture();
    try {
      await db.exec(`set role ${role}`);
      await expect(check(db)).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  });
});
