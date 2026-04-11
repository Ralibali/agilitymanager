-- 1. FIX user_roles: Add self-read policy and block privilege escalation
-- Add self-read
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Block INSERT for non-admins (only admins can assign roles)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Block UPDATE for non-admins
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Block DELETE for non-admins
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. FIX notifications INSERT policy: restrict to own user_id
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. FIX dog-photos storage: replace broad write policies with owner-scoped ones
DROP POLICY IF EXISTS "Authenticated users can delete dog photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dog photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dog photos" ON storage.objects;
-- The owner-scoped policies already exist, so no need to create them again:
-- "Users can delete own dog photos", "Users can update own dog photos", "Users can upload own dog photos"
