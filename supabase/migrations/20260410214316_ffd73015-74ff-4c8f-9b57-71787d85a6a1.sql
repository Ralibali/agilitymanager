
-- Step 1: Create all tables first
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

CREATE TABLE public.club_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.club_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.club_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.club_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.club_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.club_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'training' CHECK (event_type IN ('training', 'competition', 'social')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS on all tables
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

-- Step 3: Helper function to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id AND status = 'accepted'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id AND role = 'admin' AND status = 'accepted'
  )
$$;

-- Step 4: RLS policies for clubs
CREATE POLICY "Anyone can view clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Authenticated can create clubs" ON public.clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Club admin can update club" ON public.clubs FOR UPDATE TO authenticated USING (public.is_club_admin(auth.uid(), id));
CREATE POLICY "Club admin can delete club" ON public.clubs FOR DELETE TO authenticated USING (public.is_club_admin(auth.uid(), id));

-- RLS for club_members
CREATE POLICY "Members see club members" ON public.club_members FOR SELECT TO authenticated USING (
  public.is_club_member(auth.uid(), club_id) OR user_id = auth.uid()
);
CREATE POLICY "Users can apply" ON public.club_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin or self can update" ON public.club_members FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id)
);
CREATE POLICY "Admin or self can delete" ON public.club_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id)
);

-- RLS for club_posts
CREATE POLICY "Members can view posts" ON public.club_posts FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can create posts" ON public.club_posts FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_club_member(auth.uid(), club_id)
);
CREATE POLICY "Author or admin can update posts" ON public.club_posts FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id)
);
CREATE POLICY "Author or admin can delete posts" ON public.club_posts FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id)
);

-- RLS for club_groups
CREATE POLICY "Members can view groups" ON public.club_groups FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Admin can create groups" ON public.club_groups FOR INSERT TO authenticated WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can update groups" ON public.club_groups FOR UPDATE TO authenticated USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can delete groups" ON public.club_groups FOR DELETE TO authenticated USING (public.is_club_admin(auth.uid(), club_id));

-- RLS for club_group_members
CREATE POLICY "Members can view group members" ON public.club_group_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.club_groups g WHERE g.id = group_id AND public.is_club_member(auth.uid(), g.club_id))
);
CREATE POLICY "Admin can add group members" ON public.club_group_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.club_groups g WHERE g.id = group_id AND public.is_club_admin(auth.uid(), g.club_id))
);
CREATE POLICY "Admin or self can remove from group" ON public.club_group_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.club_groups g WHERE g.id = group_id AND public.is_club_admin(auth.uid(), g.club_id))
);

-- RLS for club_events
CREATE POLICY "Members can view events" ON public.club_events FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Admin can create events" ON public.club_events FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_club_admin(auth.uid(), club_id)
);
CREATE POLICY "Admin can update events" ON public.club_events FOR UPDATE TO authenticated USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can delete events" ON public.club_events FOR DELETE TO authenticated USING (public.is_club_admin(auth.uid(), club_id));
