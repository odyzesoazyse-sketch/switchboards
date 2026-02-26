ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "next_match_id" uuid;
ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "active_selection_dancers" uuid[] DEFAULT '{}';
ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "next_selection_dancers" uuid[] DEFAULT '{}';
ALTER TABLE ONLY "public"."nominations" ADD COLUMN IF NOT EXISTS "selection_format" integer DEFAULT 1 NOT NULL;
