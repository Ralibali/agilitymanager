
-- Add max_participants to club_events
ALTER TABLE public.club_events
  ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

-- Allow club members to view profiles of other club members (for leaderboards)
CREATE POLICY "Club members can view co-member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm1
      JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = profiles.user_id
        AND cm1.status = 'accepted'
        AND cm2.status = 'accepted'
    )
  );

-- Allow club members to view co-member dogs (for stats)
CREATE POLICY "Club members can view co-member dogs"
  ON public.dogs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm1
      JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = dogs.user_id
        AND cm1.status = 'accepted'
        AND cm2.status = 'accepted'
    )
  );

-- Allow club members to see co-member training session counts (for leaderboard)
CREATE POLICY "Club members can view co-member training"
  ON public.training_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm1
      JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = training_sessions.user_id
        AND cm1.status = 'accepted'
        AND cm2.status = 'accepted'
    )
  );
