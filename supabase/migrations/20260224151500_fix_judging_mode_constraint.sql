-- Remove constraint on judging_mode
ALTER TABLE "public"."nominations" DROP CONSTRAINT IF EXISTS "nominations_judging_mode_check";
