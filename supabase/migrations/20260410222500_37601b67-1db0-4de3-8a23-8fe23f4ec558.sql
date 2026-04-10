
CREATE TABLE public.club_event_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'signed_up',
  comment text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.club_event_signups ENABLE ROW LEVEL SECURITY;

-- Members can view signups for events in their clubs
CREATE POLICY "Members can view event signups"
ON public.club_event_signups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_events ce
    WHERE ce.id = club_event_signups.event_id
    AND is_club_member(auth.uid(), ce.club_id)
  )
);

-- Users can sign up themselves
CREATE POLICY "Users can sign up for events"
ON public.club_event_signups
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.club_events ce
    WHERE ce.id = club_event_signups.event_id
    AND is_club_member(auth.uid(), ce.club_id)
  )
);

-- Users can remove their own signup
CREATE POLICY "Users can remove own signup"
ON public.club_event_signups
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own signup
CREATE POLICY "Users can update own signup"
ON public.club_event_signups
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
