-- Tighten RLS for coach videos and feedback.
-- Goal: only the submitting user can read their video + feedback,
-- with admins (coach) retaining read access to do their job.

-- 1) Storage: ensure admins can read training-videos that belong to a coach_feedback row they need to review.
--    Existing policy already restricts SELECT to the owner (folder = auth.uid()).
--    Add a parallel admin SELECT policy scoped strictly to files referenced by coach_feedback.video_url.

DROP POLICY IF EXISTS "Admins can view coach training videos" ON storage.objects;
CREATE POLICY "Admins can view coach training videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.coach_feedback cf
    WHERE cf.video_url LIKE '%' || storage.objects.name || '%'
  )
);

-- 2) Coach feedback: re-assert that only owner + admin can SELECT.
--    (Policies already exist; recreate idempotently to be explicit.)
DROP POLICY IF EXISTS "Users can view own coach feedback" ON public.coach_feedback;
CREATE POLICY "Users can view own coach feedback"
ON public.coach_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all coach feedback" ON public.coach_feedback;
CREATE POLICY "Admins can view all coach feedback"
ON public.coach_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Coach feedback messages: same principle (owner + admin).
DROP POLICY IF EXISTS "Owners and admins can view thread messages" ON public.coach_feedback_messages;
CREATE POLICY "Owners and admins can view thread messages"
ON public.coach_feedback_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_feedback cf
    WHERE cf.id = coach_feedback_messages.feedback_id
      AND (cf.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 4) Block anonymous role explicitly (defense in depth) by ensuring policies are TO authenticated only.
--    (No public-role SELECT policy exists on these tables; nothing to drop.)