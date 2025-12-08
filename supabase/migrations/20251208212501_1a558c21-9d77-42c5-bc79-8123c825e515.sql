-- Allow anyone to upload dancer photos (for public registration)
DROP POLICY IF EXISTS "Authenticated users can upload dancer photos" ON storage.objects;
CREATE POLICY "Anyone can upload dancer photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'dancer-photos');

-- Allow anyone to update dancer photos
DROP POLICY IF EXISTS "Users can update dancer photos" ON storage.objects;
CREATE POLICY "Anyone can update dancer photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'dancer-photos');

-- Allow anyone to delete dancer photos
DROP POLICY IF EXISTS "Users can delete their uploaded photos" ON storage.objects;
CREATE POLICY "Anyone can delete dancer photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'dancer-photos');