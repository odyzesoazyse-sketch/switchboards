-- Create storage bucket for dancer photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dancer-photos', 'dancer-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view dancer photos
CREATE POLICY "Anyone can view dancer photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dancer-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload dancer photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dancer-photos' AND auth.uid() IS NOT NULL);

-- Allow organizers to delete photos
CREATE POLICY "Users can delete their uploaded photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'dancer-photos' AND auth.uid() IS NOT NULL);