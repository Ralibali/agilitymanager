-- Lättviktiga profiler (namn + e-post) för banplaneraren, utan lösenord.
create table if not exists public.planner_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  email text not null check (char_length(email) between 3 and 255),
  edit_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create unique index if not exists planner_profiles_email_key on public.planner_profiles (lower(email));
grant all on public.planner_profiles to service_role;
alter table public.planner_profiles enable row level security;

create table if not exists public.planner_courses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  author_name text not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sport text not null default 'agility',
  course_data jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists planner_courses_public_idx on public.planner_courses (is_public, created_at desc);
grant select on public.planner_courses to anon, authenticated;
grant all on public.planner_courses to service_role;
alter table public.planner_courses enable row level security;
create policy "Publika banor kan lasas av alla"
  on public.planner_courses for select
  using (is_public);

create table if not exists public.planner_course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.planner_courses(id) on delete cascade,
  profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists planner_course_comments_course_idx on public.planner_course_comments (course_id, created_at desc);
grant select on public.planner_course_comments to anon, authenticated;
grant all on public.planner_course_comments to service_role;
alter table public.planner_course_comments enable row level security;
create policy "Kommentarer pa publika banor kan lasas av alla"
  on public.planner_course_comments for select
  using (exists (select 1 from public.planner_courses c where c.id = course_id and c.is_public));

create table if not exists public.planner_course_ratings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.planner_courses(id) on delete cascade,
  profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (course_id, profile_id)
);
grant select on public.planner_course_ratings to anon, authenticated;
grant all on public.planner_course_ratings to service_role;
alter table public.planner_course_ratings enable row level security;
create policy "Betyg pa publika banor kan lasas av alla"
  on public.planner_course_ratings for select
  using (exists (select 1 from public.planner_courses c where c.id = course_id and c.is_public));