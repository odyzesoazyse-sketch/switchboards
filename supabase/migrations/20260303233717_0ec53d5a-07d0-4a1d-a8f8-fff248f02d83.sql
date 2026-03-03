
-- Bug #7: Add unique constraint on audience_votes to prevent double voting
ALTER TABLE public.audience_votes 
ADD CONSTRAINT audience_votes_match_session_unique 
UNIQUE (match_id, session_id);

-- Bug #9: Allow judges to UPDATE and organizers to DELETE match_votes
CREATE POLICY "Judges can update their votes"
ON public.match_votes
FOR UPDATE
USING (auth.uid() = judge_id);

CREATE POLICY "Organizers can delete match votes"
ON public.match_votes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN nominations n ON n.id = m.nomination_id
    JOIN battles b ON b.id = n.battle_id
    WHERE m.id = match_votes.match_id AND b.organizer_id = auth.uid()
  )
);

-- Bug #13: Fix advance_winner_to_next_match - positions are 1-indexed
-- The CEIL logic is correct for 1-indexed but the next round lookup is fragile.
-- Fix: use proper next round name mapping
CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match(p_match_id uuid, p_winner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nomination_id uuid;
  v_position integer;
  v_round text;
  v_next_position integer;
  v_next_round text;
  v_next_match_id uuid;
  v_is_left boolean;
BEGIN
  SELECT nomination_id, position, round INTO v_nomination_id, v_position, v_round
  FROM matches WHERE id = p_match_id;
  
  UPDATE matches SET winner_id = p_winner_id, is_completed = true WHERE id = p_match_id;
  
  -- Calculate next match position (1-indexed: match 1&2 feed into next pos 1, 3&4 into pos 2, etc.)
  v_next_position := CEIL(v_position::float / 2);
  v_is_left := (v_position % 2 = 1);
  
  -- Determine next round name
  v_next_round := CASE v_round
    WHEN '1/16' THEN '1/8'
    WHEN '1/8' THEN '1/4'
    WHEN '1/4' THEN '1/2'
    WHEN '1/2' THEN 'final'
    ELSE NULL
  END;
  
  IF v_next_round IS NULL THEN
    RETURN; -- Already final or unknown round
  END IF;
  
  -- Find next match by round name and position
  SELECT id INTO v_next_match_id
  FROM matches 
  WHERE nomination_id = v_nomination_id 
    AND position = v_next_position
    AND round = v_next_round
  LIMIT 1;
  
  IF v_next_match_id IS NOT NULL THEN
    IF v_is_left THEN
      UPDATE matches SET dancer_left_id = p_winner_id WHERE id = v_next_match_id;
    ELSE
      UPDATE matches SET dancer_right_id = p_winner_id WHERE id = v_next_match_id;
    END IF;
  END IF;
END;
$$;
