-- W4 (adversarial security): feedback-tabellen tog tidigare emot obegränsat
-- stora course_snapshot/page_url/user_agent från anon. Ersätt policyn med
-- samma regler plus explicita storleks-caps.

drop policy if exists "Anyone can submit planner feedback" on public.planner_feedback;

create policy "Anyone can submit planner feedback"
on public.planner_feedback
for insert
to anon, authenticated
with check (
  length(message) between 3 and 4000
  and (name is null or length(name) <= 120)
  and (email is null or length(email) <= 255)
  and category in ('ide','bugg','hinder','annat')
  and (course_snapshot is null or length(course_snapshot::text) <= 60000)
  and (page_url is null or length(page_url) <= 500)
  and (user_agent is null or length(user_agent) <= 300)
);
