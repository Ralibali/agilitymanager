
-- 1) Publik delning på saved_courses
ALTER TABLE public.saved_courses
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_saved_courses_public_slug ON public.saved_courses(public_slug) WHERE public_slug IS NOT NULL;

-- Tillåt anonyma att läsa publika banor via slug
DROP POLICY IF EXISTS "Anyone can view public courses" ON public.saved_courses;
CREATE POLICY "Anyone can view public courses"
  ON public.saved_courses FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 2) Klubb-delning
CREATE TABLE IF NOT EXISTS public.course_club_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.saved_courses(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, club_id)
);

ALTER TABLE public.course_club_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course owner can share to club"
  ON public.course_club_shares FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shared_by
    AND EXISTS (SELECT 1 FROM public.saved_courses sc WHERE sc.id = course_id AND sc.user_id = auth.uid())
    AND public.is_club_member(auth.uid(), club_id)
  );

CREATE POLICY "Owner or sharer can unshare"
  ON public.course_club_shares FOR DELETE TO authenticated
  USING (
    auth.uid() = shared_by
    OR EXISTS (SELECT 1 FROM public.saved_courses sc WHERE sc.id = course_id AND sc.user_id = auth.uid())
  );

CREATE POLICY "Members can view club shares"
  ON public.course_club_shares FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

-- Klubbmedlemmar kan läsa själva banan
DROP POLICY IF EXISTS "Club members can view shared courses" ON public.saved_courses;
CREATE POLICY "Club members can view shared courses"
  ON public.saved_courses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_club_shares ccs
      WHERE ccs.course_id = saved_courses.id
        AND public.is_club_member(auth.uid(), ccs.club_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_club_shares_course ON public.course_club_shares(course_id);
CREATE INDEX IF NOT EXISTS idx_course_club_shares_club ON public.course_club_shares(club_id);

-- 3) Kommentarer
CREATE TABLE IF NOT EXISTS public.course_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.saved_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Author can delete own comment"
  ON public.course_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can comment on visible course"
  ON public.course_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.saved_courses sc
      WHERE sc.id = course_id
        AND (
          sc.user_id = auth.uid()
          OR sc.is_public = true
          OR EXISTS (
            SELECT 1 FROM public.course_club_shares ccs
            WHERE ccs.course_id = sc.id AND public.is_club_member(auth.uid(), ccs.club_id)
          )
        )
    )
  );

CREATE POLICY "Visible to everyone with course access"
  ON public.course_comments FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_courses sc
      WHERE sc.id = course_id
        AND (
          sc.is_public = true
          OR sc.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.course_club_shares ccs
            WHERE ccs.course_id = sc.id AND public.is_club_member(auth.uid(), ccs.club_id)
          )
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_course_comments_course ON public.course_comments(course_id, created_at DESC);
