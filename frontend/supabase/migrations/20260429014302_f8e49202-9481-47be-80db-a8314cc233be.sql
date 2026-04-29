-- Trigger: notifiera användaren när coach_response uppdateras från NULL till något
CREATE OR REPLACE FUNCTION public.notify_coach_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.coach_response IS NULL OR OLD.coach_response = '') 
     AND NEW.coach_response IS NOT NULL 
     AND NEW.coach_response <> '' THEN
    INSERT INTO public.notifications (user_id, message, competition_id, read)
    VALUES (NEW.user_id, 'Din coach har svarat på din video!', NEW.id::text, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_coach_response ON public.coach_feedback;
CREATE TRIGGER trg_notify_coach_response
AFTER UPDATE OF coach_response ON public.coach_feedback
FOR EACH ROW
EXECUTE FUNCTION public.notify_coach_response();

-- Trigger: notifiera när coach skriver i tråden (uppföljning)
CREATE OR REPLACE FUNCTION public.notify_coach_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feedback_owner uuid;
BEGIN
  IF NEW.sender = 'coach' THEN
    SELECT user_id INTO feedback_owner FROM public.coach_feedback WHERE id = NEW.feedback_id;
    IF feedback_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, message, competition_id, read)
      VALUES (feedback_owner, 'Coachen har svarat på din följdfråga', NEW.feedback_id::text, false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_coach_followup ON public.coach_feedback_messages;
CREATE TRIGGER trg_notify_coach_followup
AFTER INSERT ON public.coach_feedback_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_coach_followup();