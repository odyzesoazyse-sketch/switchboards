-- Add foreign key relationship so REST join select=*,profiles(...) works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'judge_applications_user_id_fkey'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.judge_applications
      ADD CONSTRAINT judge_applications_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Helpful index for faster joins/lookups
CREATE INDEX IF NOT EXISTS idx_judge_applications_user_id
  ON public.judge_applications(user_id);
