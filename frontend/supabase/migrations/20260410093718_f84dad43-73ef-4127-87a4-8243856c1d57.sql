ALTER TABLE public.profiles 
ADD COLUMN handler_first_name text DEFAULT NULL,
ADD COLUMN handler_last_name text DEFAULT NULL;