-- Scheduled instructor courses are separate from planner_courses (agility diagrams)
-- and the legacy digital-course catalog. Existing planner profile capability proves
-- identity; an email address or client-provided owner ID never grants access.
create schema if not exists courses_private;
revoke all on schema courses_private from public;
grant usage on schema courses_private to anon, authenticated, service_role;

create table public.training_courses (
 id uuid primary key,
 profile_id uuid not null references public.planner_profiles(id) on delete restrict,
 instructor_name text not null,
 title text not null check (length(trim(title)) between 1 and 120),
 description text not null default '' check (length(description)<=5000),
 location text not null default '' check (length(location)<=200),
 sport text not null default 'agility' check (sport in ('agility','hoopers')),
 level text not null default '' check (length(level)<=120),
 max_teams integer not null check (max_teams between 1 and 100),
 price_sek integer not null default 0 check (price_sek between 0 and 100000),
 payment_mode text generated always as (case when price_sek=0 then 'free' else 'manual' end) stored,
 payment_instructions text not null default '' check (length(payment_instructions)<=1000),
 status text not null default 'draft' check (status in ('draft','published','cancelled')),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index training_courses_profile on public.training_courses(profile_id);
create index training_courses_catalog on public.training_courses(status,created_at desc);
create table public.training_course_sessions (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.training_courses(id) on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz not null,
 check (starts_at<ends_at and ends_at<=starts_at+interval '7 days')
);
create index training_course_sessions_course on public.training_course_sessions(course_id,starts_at);
create table public.training_course_registrations (
 id uuid primary key,
 course_id uuid not null references public.training_courses(id) on delete restrict,
 profile_id uuid references public.planner_profiles(id) on delete restrict,
 participant_name text not null, participant_email text not null,
 phone text not null default '' check (length(phone)<=40),
 dog jsonb not null check (jsonb_typeof(dog)='object'),
 dog_key text not null,
 status text not null check (status in ('confirmed','waitlisted','cancelled')),
 price_sek integer not null check (price_sek between 0 and 100000),
 payment_instructions text not null default '',
 payment_status text not null check (payment_status in ('not_required','unpaid','paid','refunded')),
 payment_recorded_by uuid, payment_recorded_at timestamptz,
 consent_at timestamptz not null default now(),
 queue_number bigint generated always as identity unique,
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (price_sek>0 or payment_status='not_required')
);
create unique index training_course_registration_active_dog on public.training_course_registrations(course_id,profile_id,dog_key) where status<>'cancelled';
create index training_course_registrations_queue on public.training_course_registrations(course_id,status,queue_number);
create index training_course_registrations_profile on public.training_course_registrations(profile_id);
alter table public.training_courses enable row level security;
alter table public.training_course_sessions enable row level security;
alter table public.training_course_registrations enable row level security;
-- Capability-authenticated RPCs provide narrowly scoped access; no table access
-- is given to the browser. RLS also denies rows if grants change accidentally.
revoke all on public.training_courses,public.training_course_sessions,public.training_course_registrations from public,anon,authenticated;
revoke all on sequence public.training_course_registrations_queue_number_seq from public,anon,authenticated;
grant all on public.training_courses,public.training_course_sessions,public.training_course_registrations to service_role;
grant usage,select on sequence public.training_course_registrations_queue_number_seq to service_role;

create function courses_private.course_json(p_id uuid) returns jsonb
language sql stable set search_path=pg_catalog,public,pg_temp as $$
 select to_jsonb(c)||jsonb_build_object(
 'registration_open',c.status='published' and exists(select 1 from public.training_course_sessions s where s.course_id=c.id) and not exists(select 1 from public.training_course_sessions s where s.course_id=c.id and s.starts_at<=now()),
 'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'starts_at',s.starts_at,'ends_at',s.ends_at) order by s.starts_at,s.id) from public.training_course_sessions s where s.course_id=c.id),'[]'::jsonb),
 'confirmed_count',(select count(*) from public.training_course_registrations r where r.course_id=c.id and r.status='confirmed'),
 'waitlist_count',(select count(*) from public.training_course_registrations r where r.course_id=c.id and r.status='waitlisted'),
 'available_places',greatest(0,c.max_teams-(select count(*) from public.training_course_registrations r where r.course_id=c.id and r.status='confirmed')))
 from public.training_courses c where c.id=p_id;
$$;
create function courses_private.registration_json(p_id uuid) returns jsonb
language sql stable set search_path=pg_catalog,public,pg_temp as $$
 select (to_jsonb(r)-'dog_key'-'queue_number')||jsonb_build_object(
 'waitlist_position',case when r.status='waitlisted' then (select count(*) from public.training_course_registrations q where q.course_id=r.course_id and q.status='waitlisted' and q.queue_number<=r.queue_number) else null end,
 'refund_due',r.status='cancelled' and r.payment_status='paid')
 from public.training_course_registrations r where r.id=p_id;
$$;
-- Caller must already hold the course row lock. Every mutation, including
-- capacity changes and cancellations, uses that one lock before changing seats.
create function courses_private.promote(p_course uuid) returns void
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare c public.training_courses; r public.training_course_registrations; v_count integer;
begin
 select * into c from public.training_courses where id=p_course;
 if c.status<>'published' or exists(select 1 from public.training_course_sessions where course_id=c.id and starts_at<=now()) then return; end if;
 select count(*) into v_count from public.training_course_registrations where course_id=c.id and status='confirmed';
 for r in select * from public.training_course_registrations where course_id=c.id and status='waitlisted' order by queue_number for update loop
  exit when v_count>=c.max_teams;
  update public.training_course_registrations set status='confirmed',revision=revision+1,updated_at=now() where id=r.id;
  v_count:=v_count+1;
 end loop;
end $$;

create function courses_private.catalog(p_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if p_id is not null then
  if not exists(select 1 from public.training_courses where id=p_id and status='published') then raise exception 'Kursen saknas eller är inte publicerad'; end if;
  return courses_private.course_json(p_id);
 end if;
 return coalesce((select jsonb_agg(courses_private.course_json(c.id) order by c.first_date,c.id) from (
  select t.id,min(s.starts_at) first_date from public.training_courses t join public.training_course_sessions s on s.course_id=t.id
  where t.status='published' group by t.id having min(s.starts_at)>now() order by min(s.starts_at),t.id limit 100
 ) c),'[]'::jsonb);
end $$;

create function courses_private.instructor(p_profile uuid,p_token uuid,p_action text,p_id uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.planner_profiles; c public.training_courses; r public.training_course_registrations;
 v_title text;v_description text;v_location text;v_sport text;v_level text;v_max integer;v_price integer;v_payment text;v_sessions jsonb;v_old_sessions jsonb;v_count integer;v_course uuid;
begin
 select * into p from public.planner_profiles where id=p_profile and edit_token=p_token;
 if not found then raise exception 'Din profil kunde inte verifieras'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>64000 then raise exception 'Ogiltiga uppgifter'; end if;
 if p_action='list' then
  return coalesce((select jsonb_agg(courses_private.course_json(t.id) order by t.created_at desc,t.id) from public.training_courses t where t.profile_id=p_profile),'[]'::jsonb);
 elsif p_action='export' then
  return coalesce((select jsonb_agg(jsonb_build_object('course',courses_private.course_json(t.id),'registrations',coalesce((select jsonb_agg(courses_private.registration_json(roster.id) order by roster.queue_number) from public.training_course_registrations roster where roster.course_id=t.id),'[]'::jsonb)) order by t.created_at desc,t.id) from public.training_courses t where t.profile_id=p_profile),'[]'::jsonb);
 end if;
 v_course:=case when p_action in('set_payment','cancel_registration') then (p_data->>'course_id')::uuid else p_id end;
 select * into c from public.training_courses where id=v_course for update;
 if found and c.profile_id<>p_profile then raise exception 'Du har inte behörighet till kursen'; end if;
 if p_action='save' then
  if c.id is not null and c.revision is distinct from (p_data->>'revision')::integer then raise exception 'Kursen har ändrats. Uppdatera sidan.'; end if;
  if c.status='cancelled' then raise exception 'Kursen är inställd'; end if;
  v_title:=trim(p_data->>'title');v_description:=coalesce(trim(p_data->>'description'),'');v_location:=coalesce(trim(p_data->>'location'),'');
  v_sport:=coalesce(p_data->>'sport','agility');v_level:=coalesce(trim(p_data->>'level'),'');v_max:=(p_data->>'max_teams')::integer;v_price:=coalesce((p_data->>'price_sek')::integer,0);v_payment:=coalesce(trim(p_data->>'payment_instructions'),'');
  if coalesce(length(v_title),0) not between 1 and 120 or length(v_description)>5000 or length(v_location)>200 or v_sport not in('agility','hoopers') or length(v_level)>120 or v_max is null or v_max not between 1 and 100 or v_price not between 0 and 100000 or length(v_payment)>1000 then raise exception 'Kontrollera kursnamn, beskrivning, platser och pris'; end if;
  if jsonb_typeof(p_data->'sessions') is distinct from 'array' or jsonb_array_length(p_data->'sessions') not between 1 and 30 then raise exception 'Ange 1–30 kurstillfällen'; end if;
  if exists(select 1 from jsonb_array_elements(p_data->'sessions') s where jsonb_typeof(s)<>'object' or nullif(s->>'starts_at','') is null or nullif(s->>'ends_at','') is null or (s->>'starts_at')::timestamptz>=(s->>'ends_at')::timestamptz or (s->>'ends_at')::timestamptz>(s->>'starts_at')::timestamptz+interval '7 days' or (s->>'starts_at')::timestamptz<date '2020-01-01' or (s->>'ends_at')::timestamptz>date '2100-01-01') then raise exception 'Kontrollera datum och start-/sluttider'; end if;
  select jsonb_agg(jsonb_build_object('starts_at',(s->>'starts_at')::timestamptz,'ends_at',(s->>'ends_at')::timestamptz) order by (s->>'starts_at')::timestamptz,(s->>'ends_at')::timestamptz) into v_sessions from jsonb_array_elements(p_data->'sessions') s;
  if exists(select 1 from (select (s->>'starts_at')::timestamptz starts_at,lag((s->>'ends_at')::timestamptz) over(order by (s->>'starts_at')::timestamptz,(s->>'ends_at')::timestamptz) previous_end from jsonb_array_elements(v_sessions) s) dates where starts_at<previous_end) then raise exception 'Kurstillfällena får inte överlappa'; end if;
  if c.id is not null then
   select count(*) into v_count from public.training_course_registrations where course_id=c.id and status<>'cancelled';
   if v_max<(select count(*) from public.training_course_registrations where course_id=c.id and status='confirmed') then raise exception 'Antalet platser understiger bekräftade anmälningar'; end if;
   select jsonb_agg(jsonb_build_object('starts_at',starts_at,'ends_at',ends_at) order by starts_at,ends_at) into v_old_sessions from public.training_course_sessions where course_id=c.id;
   if v_count>0 and (v_sessions is distinct from v_old_sessions or v_price<>c.price_sek or v_payment<>c.payment_instructions or v_location<>c.location or v_sport<>c.sport or v_level<>c.level) then raise exception 'Datum, plats, nivå och betalningsvillkor är låsta när deltagare är anmälda'; end if;
   update public.training_courses set title=v_title,description=v_description,location=v_location,sport=v_sport,level=v_level,max_teams=v_max,price_sek=v_price,payment_instructions=v_payment,revision=revision+1,updated_at=now() where id=c.id;
  else
   if p_id is null then raise exception 'Kursens id saknas'; end if;
   if (select count(*) from public.training_courses where profile_id=p_profile)>=100 then raise exception 'Högst 100 kurser per profil'; end if;
   insert into public.training_courses(id,profile_id,instructor_name,title,description,location,sport,level,max_teams,price_sek,payment_instructions) values(p_id,p_profile,p.name,v_title,v_description,v_location,v_sport,v_level,v_max,v_price,v_payment);
  end if;
  if v_sessions is distinct from v_old_sessions then
   delete from public.training_course_sessions where course_id=p_id;
   insert into public.training_course_sessions(course_id,starts_at,ends_at) select p_id,(s->>'starts_at')::timestamptz,(s->>'ends_at')::timestamptz from jsonb_array_elements(v_sessions) s;
  end if;
  perform courses_private.promote(p_id);
  return courses_private.course_json(p_id);
 end if;
 if c.id is null then raise exception 'Kursen saknas'; end if;
 if p_action='view' then
  return jsonb_build_object('course',courses_private.course_json(c.id),'registrations',coalesce((select jsonb_agg(courses_private.registration_json(t.id) order by t.queue_number) from public.training_course_registrations t where t.course_id=c.id),'[]'::jsonb));
 elsif p_action='delete' then
  if c.revision is distinct from (p_data->>'revision')::integer then raise exception 'Kursen har ändrats. Uppdatera sidan.'; end if;
  if c.status<>'draft' or exists(select 1 from public.training_course_registrations where course_id=c.id) then raise exception 'Endast utkast utan anmälningar kan tas bort'; end if;
  delete from public.training_courses where id=c.id;
  return jsonb_build_object('id',c.id,'deleted',true);
 elsif p_action in('publish','cancel') then
  if c.revision is distinct from (p_data->>'revision')::integer then raise exception 'Kursen har ändrats. Uppdatera sidan.'; end if;
  if c.status='cancelled' then raise exception 'Kursen är redan inställd'; end if;
  if p_action='publish' then
   if c.status<>'draft' then raise exception 'Kursen är redan publicerad'; end if;
   if c.description='' or c.location='' or (c.price_sek>0 and c.payment_instructions='') then raise exception 'Ange beskrivning, plats och betalningsinstruktioner före publicering'; end if;
   if not exists(select 1 from public.training_course_sessions where course_id=c.id) or exists(select 1 from public.training_course_sessions where course_id=c.id and starts_at<=now()) then raise exception 'Alla kurstillfällen måste ligga i framtiden'; end if;
   update public.training_courses set status='published',revision=revision+1,updated_at=now() where id=c.id;
  else
   update public.training_courses set status='cancelled',revision=revision+1,updated_at=now() where id=c.id;
   update public.training_course_registrations set status='cancelled',revision=revision+1,updated_at=now() where course_id=c.id and status<>'cancelled';
  end if;
  return courses_private.course_json(c.id);
 elsif p_action in('set_payment','cancel_registration') then
  select * into r from public.training_course_registrations where id=p_id and course_id=c.id for update;
  if not found then raise exception 'Anmälan saknas'; end if;
  if r.revision is distinct from (p_data->>'revision')::integer then raise exception 'Anmälan har ändrats. Uppdatera sidan.'; end if;
  if p_action='cancel_registration' then
   if r.status<>'cancelled' then
    update public.training_course_registrations set status='cancelled',revision=revision+1,updated_at=now() where id=r.id;
    perform courses_private.promote(c.id);
   end if;
  else
   if p_data->>'payment_status'='refunded' then
    if r.status<>'cancelled' or r.payment_status<>'paid' or (p_data->'refund_confirmed') is distinct from 'true'::jsonb then raise exception 'Bekräfta en genomförd återbetalning för en avbokad betald plats'; end if;
   elsif r.status<>'confirmed' or r.price_sek=0 or p_data->>'payment_status' is null or p_data->>'payment_status' not in('paid','unpaid') then raise exception 'Betalning kan bara registreras för en bekräftad betalkursplats'; end if;
   update public.training_course_registrations set payment_status=p_data->>'payment_status',payment_recorded_by=p_profile,payment_recorded_at=now(),revision=revision+1,updated_at=now() where id=r.id;
  end if;
  return courses_private.registration_json(r.id);
 else raise exception 'Okänd åtgärd'; end if;
end $$;

create function courses_private.participant(p_profile uuid,p_token uuid,p_action text,p_id uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.planner_profiles;c public.training_courses;r public.training_course_registrations;v_dog jsonb;v_key text;v_status text;v_phone text;
begin
 select * into p from public.planner_profiles where id=p_profile and edit_token=p_token;
 if not found then raise exception 'Din profil kunde inte verifieras'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16000 then raise exception 'Ogiltiga uppgifter'; end if;
 if p_action in('list','export') then
  return coalesce((select jsonb_agg(courses_private.registration_json(t.id)||jsonb_build_object('course',courses_private.course_json(t.course_id)) order by t.created_at desc,t.id) from public.training_course_registrations t where t.profile_id=p_profile),'[]'::jsonb);
 end if;
 select * into c from public.training_courses where id=(p_data->>'course_id')::uuid for update;
 if not found then raise exception 'Kursen saknas'; end if;
 if p_action='register' then
  if c.status<>'published' or exists(select 1 from public.training_course_sessions where course_id=c.id and starts_at<=now()) then raise exception 'Kursen är inte öppen för anmälan'; end if;
  if c.profile_id=p_profile then raise exception 'Du kan inte anmäla dig till din egen kurs'; end if;
  if (p_data->'consent') is distinct from 'true'::jsonb then raise exception 'Godkänn att kontaktuppgifter och hundprofil delas med instruktören'; end if;
  v_dog:=p_data->'dog';v_key:=trim(v_dog->>'id');v_phone:=coalesce(trim(p_data->>'phone'),'');
  if jsonb_typeof(v_dog) is distinct from 'object' or coalesce(length(v_key),0) not between 1 and 100 or coalesce(length(trim(v_dog->>'name')),0) not between 1 and 100 or length(v_phone)>40 or coalesce(v_dog->>'sport','') not in('agility','hoopers') or coalesce(length(v_dog->>'size'),0)>30 or coalesce(length(v_dog->>'agilityLevel'),0)>50 or coalesce(length(v_dog->>'hoopersLevel'),0)>50 then raise exception 'Välj en sparad hundprofil med namn och kontrollera telefonnumret'; end if;
  v_dog:=jsonb_build_object('id',v_key,'name',trim(v_dog->>'name'),'sport',v_dog->>'sport','size',coalesce(v_dog->>'size',''),'agilityLevel',coalesce(v_dog->>'agilityLevel',''),'hoopersLevel',coalesce(v_dog->>'hoopersLevel',''));
  select * into r from public.training_course_registrations where id=p_id;
  if found then
   if r.profile_id is distinct from p_profile or r.course_id<>c.id or r.dog<>v_dog or r.phone<>v_phone then raise exception 'Anmälan har redan sparats med andra uppgifter'; end if;
   return courses_private.registration_json(r.id);
  end if;
  select * into r from public.training_course_registrations where course_id=c.id and profile_id=p_profile and dog_key=v_key and status<>'cancelled';
  if found then return courses_private.registration_json(r.id); end if;
  if p_id is null then raise exception 'Anmälans id saknas'; end if;
  if (select count(*) from public.training_course_registrations where course_id=c.id and status='waitlisted')>=500 then raise exception 'Väntelistan är full'; end if;
  -- Service the existing queue before allocating a newly requested place.
  perform courses_private.promote(c.id);
  v_status:=case when (select count(*) from public.training_course_registrations where course_id=c.id and status='confirmed')<c.max_teams then 'confirmed' else 'waitlisted' end;
  insert into public.training_course_registrations(id,course_id,profile_id,participant_name,participant_email,phone,dog,dog_key,status,price_sek,payment_instructions,payment_status)
  values(p_id,c.id,p_profile,p.name,p.email,v_phone,v_dog,v_key,v_status,c.price_sek,c.payment_instructions,case when c.price_sek=0 then 'not_required' else 'unpaid' end) returning * into r;
  return courses_private.registration_json(r.id);
 elsif p_action in('cancel','erase') then
  select * into r from public.training_course_registrations where id=p_id and course_id=c.id and profile_id=p_profile for update;
  if not found then raise exception 'Anmälan saknas eller tillhör en annan profil'; end if;
  if r.revision is distinct from (p_data->>'revision')::integer then raise exception 'Anmälan har ändrats. Uppdatera sidan.'; end if;
  if p_action='erase' then
   if r.status<>'cancelled' or r.payment_status='paid' then raise exception 'Avanmäl dig och hantera eventuell återbetalning med instruktören innan personuppgifterna tas bort'; end if;
   update public.training_course_registrations set profile_id=null,participant_name='Borttagen deltagare',participant_email='',phone='',dog='{}',dog_key='erased-'||id::text,revision=revision+1,updated_at=now() where id=r.id;
  elsif r.status<>'cancelled' then
   update public.training_course_registrations set status='cancelled',revision=revision+1,updated_at=now() where id=r.id;
   perform courses_private.promote(c.id);
  end if;
  return courses_private.registration_json(r.id);
 else raise exception 'Okänd åtgärd'; end if;
end $$;

-- Non-exposed privileged implementations, with explicit capability checks above.
revoke all on all functions in schema courses_private from public,anon,authenticated;
grant execute on function courses_private.catalog(uuid),courses_private.instructor(uuid,uuid,text,uuid,jsonb),courses_private.participant(uuid,uuid,text,uuid,jsonb) to anon,authenticated,service_role;
create function public.courses_catalog(p_id uuid default null) returns jsonb
language sql security invoker set search_path=pg_catalog,public,pg_temp as $$ select courses_private.catalog(p_id); $$;
create function public.courses_instructor(p_profile uuid,p_token uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path=pg_catalog,public,pg_temp as $$ select courses_private.instructor(p_profile,p_token,p_action,p_id,p_data); $$;
create function public.courses_participant(p_profile uuid,p_token uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path=pg_catalog,public,pg_temp as $$ select courses_private.participant(p_profile,p_token,p_action,p_id,p_data); $$;
revoke all on function public.courses_catalog(uuid),public.courses_instructor(uuid,uuid,text,uuid,jsonb),public.courses_participant(uuid,uuid,text,uuid,jsonb) from public;
grant execute on function public.courses_catalog(uuid),public.courses_instructor(uuid,uuid,text,uuid,jsonb),public.courses_participant(uuid,uuid,text,uuid,jsonb) to anon,authenticated,service_role;

comment on table public.training_courses is 'Instructor-led scheduled courses. Profile deletion is restricted until bookings and retention are handled; never cascade active participants.';
comment on column public.training_course_registrations.dog is 'Explicitly consented snapshot of the participant-selected local dog profile; not an authoritative ownership claim or public dog directory.';
