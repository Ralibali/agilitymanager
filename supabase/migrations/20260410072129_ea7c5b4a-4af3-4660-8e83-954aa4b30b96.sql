-- Allow authenticated users to upload dog photos
CREATE POLICY "Authenticated users can upload dog photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-photos');

-- Allow authenticated users to update their uploaded photos
CREATE POLICY "Authenticated users can update dog photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-photos');

-- Allow authenticated users to delete dog photos
CREATE POLICY "Authenticated users can delete dog photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dog-photos');

-- Ensure public read access exists
CREATE POLICY "Dog photos are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dog-photos');