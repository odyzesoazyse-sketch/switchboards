-- Add vote_per_round boolean setting
ALTER TABLE "public"."nominations" ADD COLUMN IF NOT EXISTS "vote_per_round" BOOLEAN DEFAULT true NOT NULL;
