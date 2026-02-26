
-- Clean up orphaned user_roles referencing non-existent battles
DELETE FROM public.user_roles WHERE battle_id IS NOT NULL AND battle_id NOT IN (SELECT id FROM public.battles);

-- Clean up orphaned judge_applications
DELETE FROM public.judge_applications WHERE battle_id NOT IN (SELECT id FROM public.battles);

-- Clean up orphaned activity_logs
DELETE FROM public.activity_logs WHERE battle_id IS NOT NULL AND battle_id NOT IN (SELECT id FROM public.battles);

-- Clean up orphaned chat_messages
DELETE FROM public.chat_messages WHERE battle_id NOT IN (SELECT id FROM public.battles);

-- Clean up orphaned judge_ratings
DELETE FROM public.judge_ratings WHERE battle_id NOT IN (SELECT id FROM public.battles);

-- Now add CASCADE constraints

-- user_roles -> battles  
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_battle_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_battle_id_fkey 
  FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON DELETE CASCADE;

-- judge_applications -> battles
ALTER TABLE public.judge_applications DROP CONSTRAINT IF EXISTS judge_applications_battle_id_fkey;
ALTER TABLE public.judge_applications ADD CONSTRAINT judge_applications_battle_id_fkey 
  FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON DELETE CASCADE;

-- activity_logs -> battles
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_battle_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_battle_id_fkey 
  FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON DELETE CASCADE;

-- chat_messages -> battles
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_battle_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_battle_id_fkey 
  FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON DELETE CASCADE;

-- judge_ratings -> battles
ALTER TABLE public.judge_ratings DROP CONSTRAINT IF EXISTS judge_ratings_battle_id_fkey;
ALTER TABLE public.judge_ratings ADD CONSTRAINT judge_ratings_battle_id_fkey 
  FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
