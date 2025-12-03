-- Allow public registration for dancers when nomination is in registration phase
CREATE POLICY "Anyone can register as dancer during registration" 
ON public.dancers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM nominations n 
    WHERE n.id = dancers.nomination_id 
    AND n.phase = 'registration'
  )
);