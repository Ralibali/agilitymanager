-- Deploy before the planner frontend. Existing saved_courses remains compatible.
-- Versions stay private even when the latest course has a public link.
alter table public.saved_courses add column if not exists revision integer not null default 1;
alter table public.saved_courses enable row level security;

create table if not exists public.saved_course_versions (
  course_id uuid not null references public.saved_courses(id) on delete cascade,
  revision integer not null check (revision > 0),
  name text not null,
  course_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (course_id, revision)
);
alter table public.saved_course_versions enable row level security;
revoke all on public.saved_course_versions from public, anon, authenticated;
grant select, insert on public.saved_course_versions to authenticated;

-- All version reads require ownership, irrespective of public/club visibility.
drop policy if exists "Course owner reads versions" on public.saved_course_versions;
create policy "Course owner reads versions" on public.saved_course_versions
for select to authenticated using (
  exists (select 1 from public.saved_courses c where c.id = course_id and c.user_id = (select auth.uid()))
);
drop policy if exists "Course owner records current version" on public.saved_course_versions;
create policy "Course owner records current version" on public.saved_course_versions
for insert to authenticated with check (
  exists (select 1 from public.saved_courses c where c.id = course_id and c.user_id = (select auth.uid()) and c.revision = saved_course_versions.revision)
);

-- Add owner-only write/read policies without broadening existing public access.
-- Restrictive write policies also constrain any existing permissive write policies.
grant select, insert, update, delete on public.saved_courses to authenticated;
drop policy if exists "Planner owner reads courses" on public.saved_courses;
create policy "Planner owner reads courses" on public.saved_courses for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Planner owner inserts courses" on public.saved_courses;
create policy "Planner owner inserts courses" on public.saved_courses for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Planner owner updates courses" on public.saved_courses;
create policy "Planner owner updates courses" on public.saved_courses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Existing library.ts deletes user-owned courses; club access is read-only.
drop policy if exists "Planner restrict inserts to owner" on public.saved_courses;
create policy "Planner restrict inserts to owner" on public.saved_courses as restrictive for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Planner restrict updates to owner" on public.saved_courses;
create policy "Planner restrict updates to owner" on public.saved_courses as restrictive for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.planner_course_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    NEW.revision := 1;
  elsif NEW.course_data is distinct from OLD.course_data or NEW.name is distinct from OLD.name then
    NEW.revision := OLD.revision + 1;
  else
    NEW.revision := OLD.revision;
  end if;
  NEW.updated_at := clock_timestamp();
  return NEW;
end;
$$;

create or replace function public.planner_record_course_version()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' or NEW.revision is distinct from OLD.revision then
    insert into public.saved_course_versions(course_id, revision, name, course_data, created_at)
      values (NEW.id, NEW.revision, NEW.name, NEW.course_data, NEW.updated_at);
  end if;
  return NEW;
end;
$$;
revoke all on function public.planner_course_revision() from public, anon, authenticated;
revoke all on function public.planner_record_course_version() from public, anon, authenticated;

-- Preserve the current version of existing courses before installing triggers.
insert into public.saved_course_versions(course_id, revision, name, course_data, created_at)
select id, revision, name, course_data, updated_at from public.saved_courses
on conflict (course_id, revision) do nothing;

drop trigger if exists planner_set_course_revision on public.saved_courses;
create trigger planner_set_course_revision before insert or update on public.saved_courses
for each row execute function public.planner_course_revision();
drop trigger if exists planner_save_course_version on public.saved_courses;
create trigger planner_save_course_version after insert or update on public.saved_courses
for each row execute function public.planner_record_course_version();

create index if not exists saved_courses_owner_updated on public.saved_courses(user_id, updated_at desc, id);
