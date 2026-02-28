-- Create storage bucket for chore photos
insert into storage.buckets (id, name, public)
values ('chore-photos', 'chore-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their house folder
CREATE POLICY IF NOT EXISTS "Authenticated users can upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chore-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT house_id::text FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Allow house members to view photos
CREATE POLICY IF NOT EXISTS "House members can view photos"
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
CREATE POLICY IF NOT EXISTS "Users can delete their own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chore-photos' AND
    owner = auth.uid()
  );
