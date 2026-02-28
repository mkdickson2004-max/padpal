-- Create the storage bucket for chore photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chore-photos',
  'chore-photos',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/jpg']
);

-- Create policy to allow authenticated users to upload photos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chore-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT house_id::text FROM public.memberships WHERE user_id = auth.uid()
  )
);

-- Create policy to allow authenticated users to read photos
CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chore-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT house_id::text FROM public.memberships WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chore-photos' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Note: Run this SQL in your Supabase SQL Editor to create the bucket and policies
-- Path: https://app.supabase.com/project/_/sql