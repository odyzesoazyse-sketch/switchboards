-- Add public dancer profiles functionality
ALTER TABLE public.dancers ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.dancers ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.dancers ADD COLUMN IF NOT EXISTS wins_count integer DEFAULT 0;
ALTER TABLE public.dancers ADD COLUMN IF NOT EXISTS battles_count integer DEFAULT 0;

-- Add judge ratings table
CREATE TABLE IF NOT EXISTS public.judge_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(judge_id, battle_id, created_by)
);

-- Enable RLS on judge_ratings
ALTER TABLE public.judge_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view judge ratings
CREATE POLICY "Anyone can view judge ratings"
ON public.judge_ratings FOR SELECT
USING (true);

-- Battle organizers can add ratings
CREATE POLICY "Organizers can add judge ratings"
ON public.judge_ratings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.battles
    WHERE battles.id = judge_ratings.battle_id
    AND battles.organizer_id = auth.uid()
  )
);

-- Add judge stats view columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS judge_battles_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS judge_avg_rating numeric(3,2) DEFAULT 0;

-- Create function to update judge stats
CREATE OR REPLACE FUNCTION public.update_judge_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET judge_avg_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM public.judge_ratings WHERE judge_id = NEW.judge_id
  )
  WHERE id = NEW.judge_id;
  RETURN NEW;
END;
$$;

-- Trigger to update stats
DROP TRIGGER IF EXISTS update_judge_stats_trigger ON public.judge_ratings;
CREATE TRIGGER update_judge_stats_trigger
AFTER INSERT OR UPDATE ON public.judge_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_judge_stats();