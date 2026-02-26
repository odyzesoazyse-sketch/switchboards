CREATE TABLE IF NOT EXISTS public.selection_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE,
    dancer_id UUID REFERENCES public.dancers(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score_technique INTEGER DEFAULT 0,
    score_musicality INTEGER DEFAULT 0,
    score_performance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(nomination_id, dancer_id, judge_id)
);

ALTER TABLE public.selection_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read selection scores" ON public.selection_scores FOR SELECT USING (true);
CREATE POLICY "Judges can insert selection scores" ON public.selection_scores FOR INSERT WITH CHECK (auth.uid() = judge_id);
CREATE POLICY "Judges can update own selection scores" ON public.selection_scores FOR UPDATE USING (auth.uid() = judge_id);
CREATE POLICY "Judges can delete own selection scores" ON public.selection_scores FOR DELETE USING (auth.uid() = judge_id);
