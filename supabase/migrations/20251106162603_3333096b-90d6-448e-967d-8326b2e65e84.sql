-- Исправляем search_path для всех функций безопасности

-- Функция handle_new_user с правильным search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

-- Функция update_updated_at с правильным search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Функция create_activity_log уже имеет search_path, но обновим для согласованности
CREATE OR REPLACE FUNCTION public.create_activity_log(
  p_battle_id UUID,
  p_event_type TEXT,
  p_event_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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