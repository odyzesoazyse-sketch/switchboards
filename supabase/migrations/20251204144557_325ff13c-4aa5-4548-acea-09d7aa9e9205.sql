-- Add screen customization fields to screen_state
ALTER TABLE public.screen_state 
ADD COLUMN IF NOT EXISTS background_type text DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#1a1a2e',
ADD COLUMN IF NOT EXISTS background_gradient_from text DEFAULT '#1a1a2e',
ADD COLUMN IF NOT EXISTS background_gradient_to text DEFAULT '#16213e',
ADD COLUMN IF NOT EXISTS background_image_url text,
ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS custom_message text,
ADD COLUMN IF NOT EXISTS show_custom_message boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS animation_style text DEFAULT 'fade',
ADD COLUMN IF NOT EXISTS show_battle_name boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_round_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS timer_running boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS timer_end_time timestamptz,
ADD COLUMN IF NOT EXISTS theme_preset text DEFAULT 'dark';

-- Add comment for documentation
COMMENT ON COLUMN public.screen_state.background_type IS 'solid, gradient, or image';
COMMENT ON COLUMN public.screen_state.font_size IS 'small, normal, large, xlarge';
COMMENT ON COLUMN public.screen_state.animation_style IS 'none, fade, slide, scale';
COMMENT ON COLUMN public.screen_state.theme_preset IS 'dark, light, neon, classic';