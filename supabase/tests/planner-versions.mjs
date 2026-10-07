import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000010';
try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create table public.saved_courses(id uuid primary key default gen_random_uuid(), user_id uuid not null, name text not null, description text default '', course_data jsonb not null default '{}', is_public boolean default false, public_slug text, created_at timestamptz default now(), updated_at timestamptz default now());
    alter table public.saved_courses enable row level security;
    create policy original_read on public.saved_courses for select using (is_public or user_id = auth.uid());
    create policy original_delete on public.saved_courses for delete to authenticated using (user_id = auth.uid());
    grant select on public.saved_courses to anon;
    insert into public.saved_courses(id,user_id,name,course_data) values ('${id}','${owner}','Existing course','{"obstacles":[]}');`);
  const sql = await readFile(new URL('../migrations/20261007090204_planner_cloud_versions.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // migration is rerunnable and preserves initial snapshots
  assert.equal((await db.query('select count(*)::int as n from saved_course_versions')).rows[0].n, 1);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
  const saved = await db.query(`update saved_courses set name='TEST Hark v2',course_data='{"obstacles":[{"id":"jump"}]}' where id='${id}' and revision=1 returning revision`);
  assert.equal(saved.rows[0].revision, 2);
  const stale = await db.query(`update saved_courses set name='Stale tab' where id='${id}' and revision=1 returning id`);
  assert.equal(stale.rows.length, 0, 'stale tab must not overwrite a newer version');
  assert.equal((await db.query('select count(*)::int as n from saved_course_versions')).rows[0].n, 2);
  await assert.rejects(db.query(`update saved_course_versions set name='Tampered'`), /permission denied/);
  await assert.rejects(db.query(`delete from saved_course_versions`), /permission denied/);
  await db.exec(`update saved_courses set is_public=true where id='${id}'`);
  assert.equal((await db.query(`select revision from saved_courses where id='${id}'`)).rows[0].revision, 2);
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  assert.equal((await db.query('select * from saved_course_versions')).rows.length, 0, 'history stays private for a public course');
  assert.equal((await db.query(`update saved_courses set name='Stolen' where id='${id}' returning id`)).rows.length, 0);
  await assert.rejects(db.query(`insert into saved_courses(user_id,name) values ('${owner}','Spoof')`), /row-level security/);
  await assert.rejects(db.query(`insert into saved_course_versions(course_id,revision,name,course_data) values ('${id}',3,'Spoof','{}')`), /row-level security/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(db.query('select * from saved_course_versions'), /permission denied/);
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
  const inserted = await db.query(`insert into saved_courses(user_id,name,course_data) values ('${owner}','New private course','{}') returning id,is_public,revision`);
  assert.equal(inserted.rows[0].is_public, false);
  assert.equal(inserted.rows[0].revision, 1);
  await db.exec(`delete from saved_courses where id='${id}'`);
  assert.equal((await db.query(`select * from saved_course_versions where course_id='${id}'`)).rows.length, 0);
  console.log('PASS: migration replay, initial versions, atomic updates, stale-write conflict, private history, cross-account denial, new private course and cascading deletion.');
} finally { await db.close(); }
