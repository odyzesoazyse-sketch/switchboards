-- Add bracket layout option to screen_state
ALTER TABLE public.screen_state 
ADD COLUMN IF NOT EXISTS bracket_layout text DEFAULT 'symmetric';