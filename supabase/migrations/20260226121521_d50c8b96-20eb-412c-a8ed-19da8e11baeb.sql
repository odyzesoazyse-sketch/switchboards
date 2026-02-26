
-- Audience votes table for public voting via QR code
CREATE TABLE public.audience_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  vote_for UUID REFERENCES public.dancers(id),
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One vote per session per match
CREATE UNIQUE INDEX audience_votes_session_match ON public.audience_votes(session_id, match_id);

-- Enable RLS
ALTER TABLE public.audience_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view audience votes
CREATE POLICY "Anyone can view audience votes" ON public.audience_votes FOR SELECT USING (true);

-- Anyone can insert audience votes (public voting)
CREATE POLICY "Anyone can insert audience votes" ON public.audience_votes FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_votes;
