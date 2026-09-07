-- Private coaching reuses the existing planner profile proof. Email alone grants no access.
-- Rollback: revoke coaching RPCs and remove routes; retain training history.
create table public.coaching_groups (
 id uuid primary key, profile_id uuid not null references public.planner_profiles(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), archived boolean not null default false,
 revision integer not null default 1, created_at timestamptz not null default now()
);
create index coaching_groups_profile on public.coaching_groups(profile_id);
create table public.coaching_students (
 id uuid primary key, group_id uuid not null references public.coaching_groups(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),dog text not null default '' check(length(dog)<=100),
 active boolean not null default true,token_hash text,expires_at timestamptz,revision integer not null default 1,
 created_at timestamptz not null default now()
);
create unique index coaching_students_token on public.coaching_students(token_hash) where token_hash is not null;
create index coaching_students_group on public.coaching_students(group_id);
create table public.coaching_assignments (
 id uuid primary key,group_id uuid not null references public.coaching_groups(id) on delete cascade,
 student_id uuid references public.coaching_students(id),title text not null,goal text not null,
 course jsonb, due_date date not null,archived boolean not null default false,revision integer not null default 1,
 request_data jsonb not null,created_at timestamptz not null default now()
);
create index coaching_assignments_group on public.coaching_assignments(group_id);
create index coaching_assignments_student on public.coaching_assignments(student_id);
create table public.coaching_submissions (
 id uuid primary key,assignment_id uuid not null references public.coaching_assignments(id) on delete cascade,
 student_id uuid not null references public.coaching_students(id) on delete cascade,
 reflection text not null,video_url text not null default '',completed boolean not null,
 created_at timestamptz not null default now()
);
create index coaching_submissions_assignment on public.coaching_submissions(assignment_id);
create index coaching_submissions_student on public.coaching_submissions(student_id);
create table public.coaching_feedback (
 id uuid primary key,submission_id uuid not null references public.coaching_submissions(id) on delete cascade,
 body text not null,next_step text not null default '',video_seconds integer,
 created_at timestamptz not null default now()
);
create index coaching_feedback_submission on public.coaching_feedback(submission_id);
alter table public.coaching_groups enable row level security;
alter table public.coaching_students enable row level security;
alter table public.coaching_assignments enable row level security;
alter table public.coaching_submissions enable row level security;
alter table public.coaching_feedback enable row level security;
revoke all on public.coaching_groups,public.coaching_students,public.coaching_assignments,public.coaching_submissions,public.coaching_feedback from anon,authenticated;
grant all on public.coaching_groups,public.coaching_students,public.coaching_assignments,public.coaching_submissions,public.coaching_feedback to service_role;

create index coaching_submission_history on public.coaching_submissions(student_id,created_at desc,id desc);
create function public.coaching_history(p_group uuid,p_student uuid,p_before jsonb default null) returns jsonb
language sql stable set search_path=public,pg_temp as $$
 with selected as (
  select cs.* from public.coaching_submissions cs join public.coaching_assignments ca on ca.id=cs.assignment_id
  where ca.group_id=p_group and (p_student is null or cs.student_id=p_student)
  and (p_before is null or (cs.created_at,cs.id)<((p_before->>'at')::timestamptz,(p_before->>'id')::uuid))
  order by cs.created_at desc,cs.id desc limit 101
 ), page as (select * from selected order by created_at desc,id desc limit 100)
 select jsonb_build_object('submissions',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc,id desc) from page x),'[]'),
 'feedback',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at,f.id) from public.coaching_feedback f where f.submission_id in(select id from page)),'[]'),
 'next_cursor',case when (select count(*) from selected)>100 then (select jsonb_build_object('at',created_at,'id',id) from page order by created_at,id limit 1) else null end);
$$;
revoke all on function public.coaching_history(uuid,uuid,jsonb) from public,anon,authenticated;

create function public.coaching_instructor(p_profile uuid,p_token uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare g public.coaching_groups;s public.coaching_students;a public.coaching_assignments;r public.coaching_submissions;f public.coaching_feedback;raw_token text;v_name text;v_dog text;v_rev integer;v_student uuid;v_title text;v_goal text;v_course jsonb;v_due date;v_body text;v_next text;v_seconds integer;
begin
 perform 1 from public.planner_profiles where id=p_profile and edit_token=p_token for update;
 if not found then raise exception 'Din profil kunde inte verifieras'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>300000 then raise exception 'Ogiltiga uppgifter'; end if;
 if p_action='list' then
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.coaching_groups x where x.profile_id=p_profile),'[]');
 elsif p_action='create_group' then
  v_name:=trim(p_data->>'name');if coalesce(length(v_name),0) not between 1 and 120 then raise exception 'Ange gruppens namn'; end if;
  select * into g from public.coaching_groups where id=p_id;
  if found then
   if g.profile_id<>p_profile or g.name<>v_name then raise exception 'Gruppen har redan sparats med andra uppgifter'; end if;
   return to_jsonb(g);
  end if;
  if (select count(*) from public.coaching_groups where profile_id=p_profile)>=50 then raise exception 'Högst 50 grupper per profil'; end if;
  insert into public.coaching_groups(id,profile_id,name) values(p_id,p_profile,v_name) returning * into g;
  return to_jsonb(g);
 end if;
 select * into g from public.coaching_groups where id=case when p_action in('view','archive_group') then p_id else (p_data->>'group_id')::uuid end and profile_id=p_profile for update;
 if not found then raise exception 'Gruppen saknas'; end if;
 if p_action='view' then
  return jsonb_build_object('group',to_jsonb(g),
   'students',coalesce((select jsonb_agg(to_jsonb(x)-'token_hash' order by x.created_at) from public.coaching_students x where x.group_id=g.id),'[]'),
   'assignments',coalesce((select jsonb_agg(to_jsonb(x)-'request_data' order by x.created_at desc) from public.coaching_assignments x where x.group_id=g.id),'[]'),
   'progress',coalesce((select jsonb_agg(jsonb_build_object('student_id',x.student_id,'assignment_id',x.assignment_id,'latest_id',x.id,'completed',x.completed,'reviewed',exists(select 1 from public.coaching_feedback cf where cf.submission_id=x.id))) from (select distinct on(cs.student_id,cs.assignment_id) cs.* from public.coaching_submissions cs join public.coaching_assignments ca on ca.id=cs.assignment_id where ca.group_id=g.id order by cs.student_id,cs.assignment_id,cs.created_at desc,cs.id desc) x),'[]'))||public.coaching_history(g.id,null,p_data->'before');
 elsif p_action='archive_group' then
  if g.revision is distinct from (p_data->>'revision')::integer then raise exception 'Gruppen har ändrats. Uppdatera sidan.'; end if;
  if jsonb_typeof(p_data->'archived') is distinct from 'boolean' then raise exception 'Ogiltigt arkivval'; end if;
  update public.coaching_groups set archived=(p_data->>'archived')::boolean,revision=revision+1 where id=g.id returning * into g;
  return to_jsonb(g);
 end if;
 if g.archived and p_action<>'disable_student' then raise exception 'Gruppen är arkiverad'; end if;
 if p_action='create_student' then
  v_name:=trim(p_data->>'name');v_dog:=coalesce(trim(p_data->>'dog'),'');
  if coalesce(length(v_name),0) not between 1 and 100 or length(v_dog)>100 then raise exception 'Ange elevens namn och högst 100 tecken per fält'; end if;
  select * into s from public.coaching_students where id=p_id;
  if found then
   if s.group_id<>g.id or s.name<>v_name or s.dog<>v_dog then raise exception 'Eleven har redan sparats med andra uppgifter'; end if;
   return to_jsonb(s)-'token_hash';
  end if;
  if (select count(*) from public.coaching_students where group_id=g.id)>=100 then raise exception 'Högst 100 elever per grupp'; end if;
  raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.coaching_students(id,group_id,name,dog,token_hash,expires_at) values(p_id,g.id,v_name,v_dog,encode(digest(raw_token,'sha256'),'hex'),now()+interval '180 days') returning * into s;
  return (to_jsonb(s)-'token_hash')||jsonb_build_object('token',raw_token);
 elsif p_action in('rotate_student','disable_student') then
  select * into s from public.coaching_students where id=p_id and group_id=g.id for update;
  if not found then raise exception 'Eleven saknas'; end if;
  if s.revision is distinct from (p_data->>'revision')::integer then raise exception 'Elevens åtkomst har ändrats. Uppdatera sidan.'; end if;
  if p_action='rotate_student' then raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); end if;
  update public.coaching_students set active=p_action='rotate_student',token_hash=case when raw_token is null then null else encode(digest(raw_token,'sha256'),'hex') end,expires_at=case when raw_token is null then null else now()+interval '180 days' end,revision=revision+1 where id=p_id returning * into s;
  return (to_jsonb(s)-'token_hash')||jsonb_build_object('token',raw_token);
 elsif p_action='create_assignment' then
  v_student:=nullif(p_data->>'student_id','')::uuid;v_title:=trim(p_data->>'title');v_goal:=trim(p_data->>'goal');v_course:=nullif(p_data->'course','null'::jsonb);v_due:=(p_data->>'due_date')::date;
  if v_student is not null and not exists(select 1 from public.coaching_students where id=v_student and group_id=g.id and active) then raise exception 'Eleven saknas i gruppen'; end if;
  if coalesce(length(v_title),0) not between 1 and 120 or coalesce(length(v_goal),0) not between 1 and 4000 or v_due is null or v_due<date '2020-01-01' or v_due>date '2100-01-01' then raise exception 'Kontrollera rubrik, mål och datum'; end if;
  if v_course is not null and (jsonb_typeof(v_course)<>'object' or length(v_course->>'href')>100000 or coalesce(length(v_course->>'name'),0) not between 1 and 120 or not coalesce((v_course->>'href') ~ '^/banplanerare\?(template=[a-zA-Z0-9_-]{1,100}|bana=[a-zA-Z0-9_-]+)$',false)) then raise exception 'Välj en bana från biblioteket eller dina sparade banor'; end if;
  if v_course is not null then v_course:=jsonb_build_object('name',v_course->>'name','href',v_course->>'href'); end if;
  select * into a from public.coaching_assignments where id=p_id;
  if found then
   if a.group_id<>g.id or a.request_data<>p_data then raise exception 'Uppgiften har redan sparats med andra uppgifter'; end if;
   return to_jsonb(a)-'request_data';
  end if;
  if (select count(*) from public.coaching_assignments where group_id=g.id)>=100 then raise exception 'Högst 100 uppgifter per grupp'; end if;
  insert into public.coaching_assignments(id,group_id,student_id,title,goal,course,due_date,request_data) values(p_id,g.id,v_student,v_title,v_goal,v_course,v_due,p_data) returning * into a;
  return to_jsonb(a)-'request_data';
 elsif p_action='archive_assignment' then
  select * into a from public.coaching_assignments where id=p_id and group_id=g.id for update;
  if not found then raise exception 'Uppgiften saknas'; end if;
  if a.revision is distinct from (p_data->>'revision')::integer then raise exception 'Uppgiften har ändrats. Uppdatera sidan.'; end if;
  if jsonb_typeof(p_data->'archived') is distinct from 'boolean' then raise exception 'Ogiltigt arkivval'; end if;
  update public.coaching_assignments set archived=(p_data->>'archived')::boolean,revision=revision+1 where id=p_id returning * into a;
  return to_jsonb(a)-'request_data';
 elsif p_action='feedback' then
  select cs.* into r from public.coaching_submissions cs join public.coaching_assignments ca on ca.id=cs.assignment_id where cs.id=(p_data->>'submission_id')::uuid and ca.group_id=g.id;
  if not found then raise exception 'Träningsrapporten saknas'; end if;
  v_body:=trim(p_data->>'body');v_next:=coalesce(trim(p_data->>'next_step'),'');v_seconds:=nullif(p_data->>'video_seconds','')::integer;
  if coalesce(length(v_body),0) not between 1 and 4000 or length(v_next)>2000 or v_seconds not between 0 and 21600 then raise exception 'Kontrollera återkopplingen och tidsmarkeringen'; end if;
  if v_seconds is not null and r.video_url='' then raise exception 'Rapporten har ingen videolänk'; end if;
  select * into f from public.coaching_feedback where id=p_id;
  if found then
   if f.submission_id<>r.id or f.body<>v_body or f.next_step<>v_next or f.video_seconds is distinct from v_seconds then raise exception 'Återkopplingen har redan sparats med annat innehåll'; end if;
   return to_jsonb(f);
  end if;
  if (select count(*) from public.coaching_feedback where submission_id=r.id)>=30 then raise exception 'Högst 30 kommentarer per rapport'; end if;
  insert into public.coaching_feedback(id,submission_id,body,next_step,video_seconds) values(p_id,r.id,v_body,v_next,v_seconds) returning * into f;
  return to_jsonb(f);
 else raise exception 'Okänd åtgärd'; end if;
end $$;
revoke all on function public.coaching_instructor(uuid,uuid,text,uuid,jsonb) from public;
grant execute on function public.coaching_instructor(uuid,uuid,text,uuid,jsonb) to anon,authenticated;

create function public.coaching_student(p_token text,p_action text default 'view',p_id uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare s public.coaching_students;g public.coaching_groups;a public.coaching_assignments;r public.coaching_submissions;v_reflection text;v_video text;v_completed boolean;
begin
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Elevlänken är inte giltig'; end if;
 select * into s from public.coaching_students where token_hash=encode(digest(p_token,'sha256'),'hex') and active and expires_at>now();
 if not found then raise exception 'Elevlänken är inte giltig längre. Be instruktören om en ny.'; end if;
 select * into g from public.coaching_groups where id=s.group_id for share;
 select * into s from public.coaching_students where id=s.id and token_hash=encode(digest(p_token,'sha256'),'hex') and active and expires_at>now() for update;
 if not found then raise exception 'Elevlänken har ändrats'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16000 then raise exception 'Ogiltiga uppgifter'; end if;
 if p_action='view' then
  return jsonb_build_object('student',jsonb_build_object('id',s.id,'name',s.name,'dog',s.dog),'group',jsonb_build_object('id',g.id,'name',g.name,'archived',g.archived),
   'assignments',coalesce((select jsonb_agg(to_jsonb(x)-'request_data' order by x.created_at desc) from public.coaching_assignments x where x.group_id=g.id and (x.student_id is null or x.student_id=s.id)),'[]'),
   'history_scope','own')||public.coaching_history(g.id,s.id,p_data->'before');
 elsif p_action='submit' then
  if (p_data->'reviewed') is distinct from 'true'::jsonb then raise exception 'Granska rapporten innan du delar den'; end if;
  if g.archived then raise exception 'Gruppen är arkiverad'; end if;
  select * into a from public.coaching_assignments where id=(p_data->>'assignment_id')::uuid and group_id=g.id and (student_id is null or student_id=s.id) for share;
  if not found or a.archived then raise exception 'Uppgiften är stängd eller saknas'; end if;
  v_reflection:=trim(p_data->>'reflection');v_video:=coalesce(trim(p_data->>'video_url'),'');
  if coalesce(length(v_reflection),0) not between 1 and 4000 or length(v_video)>2000 or (v_video<>'' and v_video !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$') or jsonb_typeof(p_data->'completed') is distinct from 'boolean' then raise exception 'Skriv en reflektion och en giltig https-videolänk'; end if;
  v_completed:=(p_data->>'completed')::boolean;
  select * into r from public.coaching_submissions where id=p_id;
  if found then
   if r.student_id<>s.id or r.assignment_id<>a.id or r.reflection<>v_reflection or r.video_url<>v_video or r.completed<>v_completed then raise exception 'Rapporten har redan sparats med annat innehåll'; end if;
   return to_jsonb(r);
  end if;
  if (select count(*) from public.coaching_submissions where student_id=s.id)>=500 then raise exception 'Högst 500 rapporter per elev'; end if;
  insert into public.coaching_submissions(id,assignment_id,student_id,reflection,video_url,completed) values(p_id,a.id,s.id,v_reflection,v_video,v_completed) returning * into r;
  return to_jsonb(r);
 else raise exception 'Okänd åtgärd'; end if;
end $$;
revoke all on function public.coaching_student(text,text,uuid,jsonb) from public;
grant execute on function public.coaching_student(text,text,uuid,jsonb) to anon,authenticated;
