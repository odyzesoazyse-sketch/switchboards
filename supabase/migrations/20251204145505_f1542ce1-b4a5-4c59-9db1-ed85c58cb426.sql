-- Live chat messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Screen templates table
CREATE TABLE public.screen_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom',
  title text,
  subtitle text,
  image_url text,
  background_color text DEFAULT '#1a1a2e',
  background_gradient_from text,
  background_gradient_to text,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screen_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON public.screen_templates
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage templates" ON public.screen_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM battles WHERE battles.id = screen_templates.battle_id AND battles.organizer_id = auth.uid())
  );

-- Add sound and template fields to screen_state
ALTER TABLE public.screen_state
ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS active_template_id uuid REFERENCES public.screen_templates(id),
ADD COLUMN IF NOT EXISTS show_template boolean DEFAULT false;

-- Add video and achievements to dancers
ALTER TABLE public.dancers
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb;

-- Function to auto-advance winner to next match
CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match(
  p_match_id uuid,
  p_winner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nomination_id uuid;
  v_position integer;
  v_round text;
  v_next_position integer;
  v_next_match_id uuid;
  v_is_left boolean;
BEGIN
  -- Get current match info
  SELECT nomination_id, position, round INTO v_nomination_id, v_position, v_round
  FROM matches WHERE id = p_match_id;
  
  -- Update current match with winner
  UPDATE matches SET winner_id = p_winner_id, is_completed = true WHERE id = p_match_id;
  
  -- Calculate next match position (bracket logic: position/2 rounded up)
  v_next_position := CEIL(v_position::float / 2);
  v_is_left := (v_position % 2 = 1);
  
  -- Find or create next round match
  SELECT id INTO v_next_match_id
  FROM matches 
  WHERE nomination_id = v_nomination_id 
    AND position = v_next_position
    AND round != v_round
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If next match exists, update it with the winner
  IF v_next_match_id IS NOT NULL THEN
    IF v_is_left THEN
      UPDATE matches SET dancer_left_id = p_winner_id WHERE id = v_next_match_id;
    ELSE
      UPDATE matches SET dancer_right_id = p_winner_id WHERE id = v_next_match_id;
    END IF;
  END IF;
END;
$$;