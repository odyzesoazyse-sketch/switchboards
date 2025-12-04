-- Add custom criteria support to nominations
ALTER TABLE public.nominations 
ADD COLUMN IF NOT EXISTS judging_criteria JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rounds_to_win INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS allow_ties BOOLEAN DEFAULT false;

-- Add preset judging modes as comments for reference:
-- simple: Pick winner (left/right)
-- sliders: 3 sliders (-5 to +5) for technique, musicality, performance
-- points_5: Score each dancer 1-5 points
-- points_10: Score each dancer 1-10 points
-- criteria_custom: Custom criteria with configurable ranges