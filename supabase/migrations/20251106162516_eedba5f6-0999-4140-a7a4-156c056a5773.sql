-- Добавляем новые роли в enum app_role
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operator') THEN
    ALTER TYPE app_role ADD VALUE 'operator';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'participant') THEN
    ALTER TYPE app_role ADD VALUE 'participant';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'spectator') THEN
    ALTER TYPE app_role ADD VALUE 'spectator';
  END IF;
END $$;

-- Таблица заявок судей на батлы
CREATE TABLE IF NOT EXISTS public.judge_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- Таблица логов активности
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_judge_applications_battle ON public.judge_applications(battle_id);
CREATE INDEX IF NOT EXISTS idx_judge_applications_user ON public.judge_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_battle ON public.activity_logs(battle_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- RLS для judge_applications
ALTER TABLE public.judge_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view judge applications" ON public.judge_applications;
CREATE POLICY "Anyone can view judge applications"
ON public.judge_applications
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create own applications" ON public.judge_applications;
CREATE POLICY "Users can create own applications"
ON public.judge_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can manage applications" ON public.judge_applications;
CREATE POLICY "Organizers can manage applications"
ON public.judge_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.battles
    WHERE battles.id = judge_applications.battle_id
    AND battles.organizer_id = auth.uid()
  )
);

-- RLS для activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view activity logs" ON public.activity_logs;
CREATE POLICY "Anyone can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "System can create logs" ON public.activity_logs;
CREATE POLICY "System can create logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Триггер для обновления updated_at в judge_applications
DROP TRIGGER IF EXISTS update_judge_applications_updated_at ON public.judge_applications;
CREATE TRIGGER update_judge_applications_updated_at
BEFORE UPDATE ON public.judge_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Функция для создания лога
CREATE OR REPLACE FUNCTION public.create_activity_log(
  p_battle_id UUID,
  p_event_type TEXT,
  p_event_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (battle_id, user_id, event_type, event_details)
  VALUES (p_battle_id, auth.uid(), p_event_type, p_event_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;