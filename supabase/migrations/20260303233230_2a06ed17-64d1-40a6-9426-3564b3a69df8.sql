
-- Bug #3: Add unique constraint on match_votes for proper upsert
ALTER TABLE public.match_votes 
ADD CONSTRAINT match_votes_match_judge_round_unique 
UNIQUE (match_id, judge_id, round_number);
