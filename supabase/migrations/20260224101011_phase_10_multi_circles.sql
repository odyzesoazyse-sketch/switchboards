-- Add concurrent_circles to nominations
ALTER TABLE "public"."nominations" ADD COLUMN IF NOT EXISTS "concurrent_circles" INTEGER DEFAULT 1 NOT NULL;

-- Create judge_assignments table
CREATE TABLE IF NOT EXISTS "public"."judge_assignments" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "battle_id" UUID REFERENCES "public"."battles"("id") ON DELETE CASCADE NOT NULL,
    "judge_id" UUID REFERENCES "public"."profiles"("id") ON DELETE CASCADE NOT NULL,
    "nomination_id" UUID REFERENCES "public"."nominations"("id") ON DELETE CASCADE,
    "phase" TEXT, -- e.g., 'selection', 'bracket', or NULL for all phases in that nomination
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("battle_id", "judge_id", "nomination_id", "phase")
);

-- Enable RLS for judge_assignments
ALTER TABLE "public"."judge_assignments" ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for judge_assignments
CREATE POLICY "Anyone can read judge assignments" ON "public"."judge_assignments" FOR SELECT USING (true);
CREATE POLICY "Organizers can insert judge assignments" ON "public"."judge_assignments" FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND battle_id = judge_assignments.battle_id AND role = 'organizer'
    )
);
CREATE POLICY "Organizers can delete judge assignments" ON "public"."judge_assignments" FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND battle_id = judge_assignments.battle_id AND role = 'organizer'
    )
);

-- Enable Realtime for judge_assignments
alter publication supabase_realtime add table "public"."judge_assignments";
