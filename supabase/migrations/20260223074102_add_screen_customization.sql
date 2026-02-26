-- Add screen customization columns
ALTER TABLE public.screen_state
ADD COLUMN IF NOT EXISTS bracket_style text DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'display',
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text;
