
CREATE TABLE public.coach_feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.coach_feedback(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','coach')),
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_feedback_messages_feedback_id ON public.coach_feedback_messages(feedback_id, created_at);

ALTER TABLE public.coach_feedback_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: ärendets ägare eller admin
CREATE POLICY "Owners and admins can view thread messages"
ON public.coach_feedback_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_feedback cf
    WHERE cf.id = coach_feedback_messages.feedback_id
      AND (cf.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- INSERT användarmeddelande: ägare av ärendet, sender='user', max 1 totalt
CREATE POLICY "Owner can post one followup as user"
ON public.coach_feedback_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender = 'user'
  AND EXISTS (
    SELECT 1 FROM public.coach_feedback cf
    WHERE cf.id = coach_feedback_messages.feedback_id
      AND cf.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.coach_feedback_messages m
    WHERE m.feedback_id = coach_feedback_messages.feedback_id
      AND m.sender = 'user'
  )
);

-- INSERT coachmeddelande: admin, sender='coach', max 1 totalt
CREATE POLICY "Admin can post one followup as coach"
ON public.coach_feedback_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender = 'coach'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.coach_feedback_messages m
    WHERE m.feedback_id = coach_feedback_messages.feedback_id
      AND m.sender = 'coach'
  )
);

-- DELETE: admin eller ägare av ärendet
CREATE POLICY "Owner or admin can delete thread messages"
ON public.coach_feedback_messages FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.coach_feedback cf
    WHERE cf.id = coach_feedback_messages.feedback_id
      AND cf.user_id = auth.uid()
  )
);
