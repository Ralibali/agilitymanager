
-- Allow admins to read all dogs for stats/detail
CREATE POLICY "Admins can view all dogs"
ON public.dogs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all training sessions
CREATE POLICY "Admins can view all training"
ON public.training_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all competition results
CREATE POLICY "Admins can view all competitions"
ON public.competition_results FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all health logs
CREATE POLICY "Admins can view all health logs"
ON public.health_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all stopwatch results
CREATE POLICY "Admins can view all stopwatch results"
ON public.stopwatch_results FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
