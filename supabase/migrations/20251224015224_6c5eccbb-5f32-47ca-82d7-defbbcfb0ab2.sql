-- Add new columns for detailed battle info
ALTER TABLE public.ranking_battles 
ADD COLUMN IF NOT EXISTS round text,
ADD COLUMN IF NOT EXISTS match_position integer,
ADD COLUMN IF NOT EXISTS judge_votes jsonb DEFAULT '[]'::jsonb;

-- Allow updates on ranking_battles
CREATE POLICY "Anyone can update ranking battles" 
ON public.ranking_battles 
FOR UPDATE 
USING (true);