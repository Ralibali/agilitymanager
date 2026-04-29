
-- Add coach_response column for human coach reply
ALTER TABLE public.coach_feedback ADD COLUMN IF NOT EXISTS coach_response text;

-- Allow admins to view all coach feedback
CREATE POLICY "Admins can view all coach feedback"
ON public.coach_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update all coach feedback (to write responses)
CREATE POLICY "Admins can update all coach feedback"
ON public.coach_feedback
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
