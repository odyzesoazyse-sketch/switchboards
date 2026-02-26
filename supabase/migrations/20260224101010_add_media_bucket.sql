-- Create "media" storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for "media" bucket
CREATE POLICY "Public Access" 
    ON storage.objects FOR SELECT 
    USING ( bucket_id = 'media' );

CREATE POLICY "Anyone can upload media"
    ON storage.objects FOR INSERT 
    WITH CHECK ( bucket_id = 'media' );

CREATE POLICY "Anyone can update own media"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'media' );

CREATE POLICY "Anyone can delete own media"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'media' );
