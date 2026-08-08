CREATE OR REPLACE FUNCTION public.get_club_members(p_club_id uuid)
RETURNS TABLE(user_id uuid, role text, status text, joined_at timestamptz, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.user_id, cm.role, cm.status, cm.joined_at,
         COALESCE(p.display_name, 'Medlem') AS display_name,
         p.avatar_url
  FROM public.club_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  WHERE cm.club_id = p_club_id
    AND public.is_club_member(auth.uid(), p_club_id)
  ORDER BY (cm.role = 'admin') DESC, cm.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_members(uuid) TO authenticated;