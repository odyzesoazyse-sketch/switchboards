-- Add show_bracket field to screen_state
ALTER TABLE screen_state ADD COLUMN IF NOT EXISTS show_bracket boolean DEFAULT false;