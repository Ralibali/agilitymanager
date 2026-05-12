
-- 1. Profiles: remove blanket club co-member SELECT, replace with safe view
DROP POLICY IF EXISTS "Club members can view co-member profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.profiles_club_public AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.handler_first_name,
  p.handler_last_name
FROM public.profiles p
WHERE
  p.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.club_members cm1
    JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = p.user_id
      AND cm1.status = 'accepted'
      AND cm2.status = 'accepted'
  );

REVOKE ALL ON public.profiles_club_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_club_public TO authenticated;

-- 2. Clubs: tighten SELECT to authenticated, expose invite-code lookup via SECURITY DEFINER
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;

CREATE POLICY "Authenticated can view clubs"
ON public.clubs
FOR SELECT
TO authenticated
USING (true);

-- Anonymous-friendly lookup for invite landing page (returns no invite_code)
CREATE OR REPLACE FUNCTION public.get_club_by_invite_code(p_code text)
RETURNS TABLE(id uuid, name text, description text, city text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.description, c.city, c.logo_url
  FROM public.clubs c
  WHERE c.invite_code = p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_club_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_by_invite_code(text) TO anon, authenticated;

-- Admins can fetch their own club's invite code on demand
CREATE OR REPLACE FUNCTION public.get_my_club_invite_code(p_club_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.invite_code
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND public.is_club_admin(auth.uid(), c.id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_club_invite_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_club_invite_code(uuid) TO authenticated;

-- 3. Storage: add UPDATE policy on training-videos
CREATE POLICY "Users can update own training videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'training-videos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'training-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Lock down SECURITY DEFINER helpers from anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_friend(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_club_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_friend(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated;
