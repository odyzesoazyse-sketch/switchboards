-- Phase 9: Advanced Qualification System Migration

-- 1. Add selection_format to nominations (number of dancers at once, default 1)
ALTER TABLE ONLY "public"."nominations" ADD COLUMN IF NOT EXISTS "selection_format" integer DEFAULT 1 NOT NULL;

-- 2. Add new lists to screen_state
ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "next_match_id" uuid;
ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "active_selection_dancers" uuid[] DEFAULT '{}';
ALTER TABLE ONLY "public"."screen_state" ADD COLUMN IF NOT EXISTS "next_selection_dancers" uuid[] DEFAULT '{}';

-- Fix relation for next_match_id (safe adding constraint if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'screen_state_next_match_id_fkey'
    ) THEN
        ALTER TABLE ONLY "public"."screen_state" ADD CONSTRAINT "screen_state_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create selection_scores table
CREATE TABLE IF NOT EXISTS "public"."selection_scores" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "nomination_id" uuid NOT NULL,
    "judge_id" uuid NOT NULL,
    "dancer_id" uuid NOT NULL,
    "score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'selection_scores_pkey') THEN
        ALTER TABLE ONLY "public"."selection_scores" ADD CONSTRAINT "selection_scores_pkey" PRIMARY KEY ("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'selection_scores_nomination_id_fkey') THEN
        ALTER TABLE ONLY "public"."selection_scores" ADD CONSTRAINT "selection_scores_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'selection_scores_judge_id_fkey') THEN
        ALTER TABLE ONLY "public"."selection_scores" ADD CONSTRAINT "selection_scores_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'selection_scores_dancer_id_fkey') THEN
        ALTER TABLE ONLY "public"."selection_scores" ADD CONSTRAINT "selection_scores_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Realtime for selection_scores
alter publication supabase_realtime add table "public"."selection_scores";

-- Add RLS policies for selection_scores
ALTER TABLE "public"."selection_scores" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'selection_scores' AND policyname = 'Anyone can read selection scores'
    ) THEN
        CREATE POLICY "Anyone can read selection scores" ON "public"."selection_scores" FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'selection_scores' AND policyname = 'Anyone can insert selection scores'
    ) THEN
        CREATE POLICY "Anyone can insert selection scores" ON "public"."selection_scores" FOR INSERT WITH CHECK (true);
    END IF;
END $$;
