
-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.is_friend(_user_id uuid, _friend_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = _user_id AND receiver_id = _friend_id) OR
      (requester_id = _friend_id AND receiver_id = _user_id)
    )
  )
$$;

-- Friends can view each other's dogs
CREATE POLICY "Friends can view dogs"
ON public.dogs
FOR SELECT
TO authenticated
USING (public.is_friend(auth.uid(), user_id));

-- Friends can view each other's training sessions
CREATE POLICY "Friends can view training"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (public.is_friend(auth.uid(), user_id));

-- Friends can view competition results if profile allows it
CREATE POLICY "Friends can view competition results"
ON public.competition_results
FOR SELECT
TO authenticated
USING (
  public.is_friend(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = competition_results.user_id
    AND p.show_results_to_friends = true
  )
);
