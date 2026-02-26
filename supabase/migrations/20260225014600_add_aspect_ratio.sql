-- Add aspect ratio to screen state
ALTER TABLE "public"."screen_state" ADD COLUMN IF NOT EXISTS "aspect_ratio" text DEFAULT 'auto';
