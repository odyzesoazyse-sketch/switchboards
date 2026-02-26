BEGIN;

-- Ensure replica identity is full so that updates broadcast the whole row
ALTER TABLE public.screen_state REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.dancers REPLICA IDENTITY FULL;
ALTER TABLE public.match_votes REPLICA IDENTITY FULL;

-- Ensure anon has correct SELECT privileges (which are then filtered by RLS policies)
GRANT SELECT ON public.screen_state TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT SELECT ON public.dancers TO anon;
GRANT SELECT ON public.match_votes TO anon;

COMMIT;
