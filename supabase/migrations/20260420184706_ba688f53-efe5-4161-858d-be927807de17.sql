UPDATE public.breeds
SET published = true, updated_at = now()
WHERE slug IN ('border-collie', 'shetland-sheepdog', 'miniature-american-shepherd', 'papillon');