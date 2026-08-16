CREATE POLICY "Friends can view match profiles"
ON public.dog_match_profiles FOR SELECT
TO authenticated
USING (public.is_friend(auth.uid(), user_id));

CREATE POLICY "Friends can edit match profiles"
ON public.dog_match_profiles FOR UPDATE
TO authenticated
USING (public.is_friend(auth.uid(), user_id))
WITH CHECK (public.is_friend(auth.uid(), user_id));