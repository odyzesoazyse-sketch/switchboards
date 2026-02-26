-- Create ranking tables that were missing from initial migrations
CREATE TABLE IF NOT EXISTS public.ranking_dancers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    wins_count integer DEFAULT 0,
    losses_count integer DEFAULT 0,
    battles_count integer DEFAULT 0,
    pagerank_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ranking_battles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    winner_id uuid NOT NULL REFERENCES public.ranking_dancers(id) ON DELETE CASCADE,
    loser_id uuid NOT NULL REFERENCES public.ranking_dancers(id) ON DELETE CASCADE,
    tournament_name text,
    battle_date timestamp with time zone,
    is_demo boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

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