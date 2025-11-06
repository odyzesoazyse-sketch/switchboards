-- Allow users to cancel their own pending judge applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'judge_applications'
      AND p.policyname = 'Users can delete own pending applications'
  ) THEN
    CREATE POLICY "Users can delete own pending applications"
    ON public.judge_applications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');
  END IF;
END $$;