-- Review against the target database before installation. This file does not
-- add cascades or delete any records. It deliberately fails closed when an
-- auth-linked table has not been covered by a validated ON DELETE CASCADE FK.
-- Invoke through the server's service-role client only.
create or replace function public.account_deletion_preflight(p_user_id uuid, p_session_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare unsupported boolean;
begin
  if not exists(select 1 from auth.sessions where id=p_session_id and user_id=p_user_id)
    or not exists(select 1 from auth.users where id=p_user_id) then
    return 'inactive_session';
  end if;

  -- Check the entire cascade graph, including comments/shares depending on
  -- saved courses, dogs and account profiles. Supabase-owned internal auth
  -- relationships are managed by Auth and are not changed by this function.
  with recursive owned(oid) as (
    select 'auth.users'::regclass::oid
    union
    select c.conrelid from pg_catalog.pg_constraint c join owned o on c.confrelid=o.oid
    join pg_catalog.pg_class t on t.oid=c.conrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname not in ('auth','storage')
  )
  select exists(
    select 1 from pg_catalog.pg_constraint c join owned o on c.confrelid=o.oid
    join pg_catalog.pg_class t on t.oid=c.conrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname not in ('auth','storage')
    and (c.confdeltype<>'c' or not c.convalidated)
  ) into unsupported;
  if unsupported then return 'not_ready'; end if;

  -- Older schema is not fully represented in repository migrations. Catch
  -- orphan-prone identity columns in exposed public tables (including the
  -- current dog_match_profiles.user_id, which has no FK in local migrations).
  select exists(
    select 1 from pg_catalog.pg_attribute a
    join pg_catalog.pg_class t on t.oid=a.attrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
    and a.attname in ('user_id','owner_id','author_id','created_by','coach_id','sender_id',
      'receiver_id','requester_id','recipient_id','referred_user_id','referrer_id')
    and not exists (
      select 1 from pg_catalog.pg_constraint c
      where c.conrelid=t.oid and c.contype='f' and c.convalidated and c.confdeltype='c'
        and c.conkey=array[a.attnum]::smallint[]
        and c.confrelid='auth.users'::regclass
        and c.confkey=array[(select attnum from pg_catalog.pg_attribute
          where attrelid='auth.users'::regclass and attname='id')]::smallint[]
    )
  ) into unsupported;
  if unsupported then return 'not_ready'; end if;

  -- Storage deletion must use the Storage API, never SQL row deletion. No
  -- storage upload is used by current app code. Accounts owning objects must
  -- be handled separately before this function can allow hard deletion.
  if exists(select 1 from storage.objects where owner_id=p_user_id::text) then
    return 'not_ready';
  end if;
  return 'ready';
end $$;
revoke all on function public.account_deletion_preflight(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_deletion_preflight(uuid,uuid) to service_role;
-- Required because this SECURITY INVOKER checker reads live session existence.
-- It exposes no new access to anonymous or signed-in client roles.
grant select on auth.users,auth.sessions to service_role;
