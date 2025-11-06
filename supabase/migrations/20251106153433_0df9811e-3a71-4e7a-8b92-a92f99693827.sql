-- Create screen state table for operator control
CREATE TABLE public.screen_state (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE,
  current_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  current_round INTEGER DEFAULT 1,
  show_judges BOOLEAN DEFAULT true,
  show_timer BOOLEAN DEFAULT false,
  timer_seconds INTEGER DEFAULT 0,
  show_winner BOOLEAN DEFAULT false,
  show_score BOOLEAN DEFAULT true,
  rounds_to_win INTEGER DEFAULT 2,
  match_status TEXT DEFAULT 'waiting',
  votes_left INTEGER DEFAULT 0,
  votes_right INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screen_state ENABLE ROW LEVEL SECURITY;

-- Anyone can view screen state
CREATE POLICY "Anyone can view screen state"
  ON public.screen_state
  FOR SELECT
  USING (true);

-- Organizers can manage screen state
CREATE POLICY "Organizers can manage screen state"
  ON public.screen_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = screen_state.battle_id
      AND battles.organizer_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_state;

-- Create trigger for updated_at
CREATE TRIGGER update_screen_state_updated_at
  BEFORE UPDATE ON public.screen_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();