create table public.planner_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  category text not null default 'ide',
  message text not null,
  course_snapshot jsonb,
  page_url text,
  user_agent text
);

grant insert on public.planner_feedback to anon, authenticated;
grant all on public.planner_feedback to service_role;

alter table public.planner_feedback enable row level security;

create policy "Anyone can submit planner feedback"
on public.planner_feedback
for insert
to anon, authenticated
with check (
  length(message) between 3 and 4000
  and (name is null or length(name) <= 120)
  and (email is null or length(email) <= 255)
  and category in ('ide','bugg','hinder','annat')
);