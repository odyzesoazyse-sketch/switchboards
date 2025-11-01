-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('organizer', 'judge', 'selector');

-- Create enum for battle phase
CREATE TYPE public.battle_phase AS ENUM ('registration', 'selection', 'bracket', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  battle_id UUID,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, battle_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create battles table
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  phase public.battle_phase NOT NULL DEFAULT 'registration',
  seed_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- Create nominations table
CREATE TABLE public.nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_dancers INTEGER DEFAULT 50,
  top_count INTEGER DEFAULT 16,
  phase public.battle_phase NOT NULL DEFAULT 'registration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;

-- Create dancers table
CREATE TABLE public.dancers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id UUID NOT NULL REFERENCES public.nominations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  photo_url TEXT,
  position INTEGER,
  average_score DECIMAL(4,2) DEFAULT 0,
  is_qualified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dancers ENABLE ROW LEVEL SECURITY;

-- Create scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dancer_id UUID NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technique INTEGER CHECK (technique >= 1 AND technique <= 10),
  creativity INTEGER CHECK (creativity >= 1 AND creativity <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  total INTEGER GENERATED ALWAYS AS (technique + creativity + energy) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dancer_id, judge_id)
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Create matches table for bracket phase
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id UUID NOT NULL REFERENCES public.nominations(id) ON DELETE CASCADE,
  round TEXT NOT NULL,
  position INTEGER NOT NULL,
  dancer_left_id UUID REFERENCES public.dancers(id) ON DELETE SET NULL,
  dancer_right_id UUID REFERENCES public.dancers(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.dancers(id) ON DELETE SET NULL,
  votes_left INTEGER DEFAULT 0,
  votes_right INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create match_votes table
CREATE TABLE public.match_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  vote_for UUID REFERENCES public.dancers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, judge_id, round_number)
);

ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for battles
CREATE POLICY "Anyone can view battles"
  ON public.battles FOR SELECT
  USING (true);

CREATE POLICY "Organizers can create battles"
  ON public.battles FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update own battles"
  ON public.battles FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete own battles"
  ON public.battles FOR DELETE
  USING (auth.uid() = organizer_id);

-- RLS Policies for nominations
CREATE POLICY "Anyone can view nominations"
  ON public.nominations FOR SELECT
  USING (true);

CREATE POLICY "Battle organizers can manage nominations"
  ON public.nominations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = nominations.battle_id
      AND battles.organizer_id = auth.uid()
    )
  );

-- RLS Policies for dancers
CREATE POLICY "Anyone can view dancers"
  ON public.dancers FOR SELECT
  USING (true);

CREATE POLICY "Selectors and organizers can manage dancers"
  ON public.dancers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.nominations n
      JOIN public.battles b ON b.id = n.battle_id
      WHERE n.id = dancers.nomination_id
      AND (
        b.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.battle_id = b.id
          AND user_roles.role = 'selector'
        )
      )
    )
  );

-- RLS Policies for scores
CREATE POLICY "Anyone can view scores"
  ON public.scores FOR SELECT
  USING (true);

CREATE POLICY "Judges can insert their scores"
  ON public.scores FOR INSERT
  WITH CHECK (
    auth.uid() = judge_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.dancers d ON d.id = scores.dancer_id
      JOIN public.nominations n ON n.id = d.nomination_id
      WHERE ur.user_id = auth.uid()
      AND ur.battle_id = n.battle_id
      AND ur.role = 'judge'
    )
  );

CREATE POLICY "Judges can update their scores"
  ON public.scores FOR UPDATE
  USING (auth.uid() = judge_id);

-- RLS Policies for matches
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.nominations n
      JOIN public.battles b ON b.id = n.battle_id
      WHERE n.id = matches.nomination_id
      AND b.organizer_id = auth.uid()
    )
  );

-- RLS Policies for match_votes
CREATE POLICY "Anyone can view match votes"
  ON public.match_votes FOR SELECT
  USING (true);

CREATE POLICY "Judges can insert their votes"
  ON public.match_votes FOR INSERT
  WITH CHECK (
    auth.uid() = judge_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.matches m ON m.id = match_votes.match_id
      JOIN public.nominations n ON n.id = m.nomination_id
      WHERE ur.user_id = auth.uid()
      AND ur.battle_id = n.battle_id
      AND ur.role = 'judge'
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view user roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Battle organizers can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = user_roles.battle_id
      AND battles.organizer_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_battles_updated_at
  BEFORE UPDATE ON public.battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dancers;