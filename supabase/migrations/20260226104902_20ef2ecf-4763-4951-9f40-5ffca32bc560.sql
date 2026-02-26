
-- Add missing columns to nominations
ALTER TABLE public.nominations ADD COLUMN IF NOT EXISTS concurrent_circles integer DEFAULT 1;
ALTER TABLE public.nominations ADD COLUMN IF NOT EXISTS selection_format integer DEFAULT 1;
ALTER TABLE public.nominations ADD COLUMN IF NOT EXISTS vote_per_round boolean DEFAULT true;

-- Add missing columns to screen_state
ALTER TABLE public.screen_state ADD COLUMN IF NOT EXISTS next_match_id uuid REFERENCES public.matches(id);
ALTER TABLE public.screen_state ADD COLUMN IF NOT EXISTS active_selection_dancers text[] DEFAULT '{}';
ALTER TABLE public.screen_state ADD COLUMN IF NOT EXISTS next_selection_dancers text[] DEFAULT '{}';

-- Create judge_assignments table
CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.profiles(id),
  nomination_id uuid NOT NULL REFERENCES public.nominations(id) ON DELETE CASCADE,
  phase text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(battle_id, judge_id, nomination_id)
);

ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view judge assignments" ON public.judge_assignments FOR SELECT USING (true);
CREATE POLICY "Organizers can manage judge assignments" ON public.judge_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.battles WHERE battles.id = judge_assignments.battle_id AND battles.organizer_id = auth.uid())
);

-- Create selection_scores table
CREATE TABLE IF NOT EXISTS public.selection_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomination_id uuid NOT NULL REFERENCES public.nominations(id) ON DELETE CASCADE,
  dancer_id uuid NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.profiles(id),
  score_technique numeric DEFAULT 5,
  score_musicality numeric DEFAULT 5,
  score_performance numeric DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(nomination_id, dancer_id, judge_id)
);

ALTER TABLE public.selection_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view selection scores" ON public.selection_scores FOR SELECT USING (true);
CREATE POLICY "Judges can upsert their scores" ON public.selection_scores FOR INSERT WITH CHECK (auth.uid() = judge_id);
CREATE POLICY "Judges can update their scores" ON public.selection_scores FOR UPDATE USING (auth.uid() = judge_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.selection_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judge_assignments;
