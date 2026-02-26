-- Enable realtime for all tables required for sync
begin;

-- Remove the old publication if it exists to clean up
drop publication if exists supabase_realtime;

-- Create the publication for realtime
create publication supabase_realtime;

-- Add all required tables
alter publication supabase_realtime add table "public"."screen_state";
alter publication supabase_realtime add table "public"."matches";
alter publication supabase_realtime add table "public"."dancers";
alter publication supabase_realtime add table "public"."match_votes";
alter publication supabase_realtime add table "public"."judge_assignments";
alter publication supabase_realtime add table "public"."selection_scores";

commit;
