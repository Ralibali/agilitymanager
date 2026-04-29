-- Health logs for vet visits, vaccinations, weight
CREATE TABLE public.health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'vet_visit',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  weight_kg numeric DEFAULT NULL,
  next_date date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health logs" ON public.health_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health logs" ON public.health_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health logs" ON public.health_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own health logs" ON public.health_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved courses for the course planner
CREATE TABLE public.saved_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  course_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  canvas_width integer NOT NULL DEFAULT 800,
  canvas_height integer NOT NULL DEFAULT 600,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses" ON public.saved_courses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON public.saved_courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.saved_courses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.saved_courses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_courses_updated_at BEFORE UPDATE ON public.saved_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stopwatch results
CREATE TABLE public.stopwatch_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time_ms integer NOT NULL,
  faults integer NOT NULL DEFAULT 0,
  refusals integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stopwatch_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stopwatch results" ON public.stopwatch_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stopwatch results" ON public.stopwatch_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stopwatch results" ON public.stopwatch_results FOR DELETE TO authenticated USING (auth.uid() = user_id);