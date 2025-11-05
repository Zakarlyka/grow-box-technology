-- Функція для отримання ролі поточного користувача
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Функція для адміністраторів: отримати всіх користувачів з їх ролями
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  app_role app_role,
  full_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.email,
    COALESCE(ur.app_role, 'user'::app_role) as app_role,
    p.full_name
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
$$;

-- Функція для отримання налаштувань пристрою
CREATE OR REPLACE FUNCTION public.get_device_settings(device_id_input uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(settings, '{}'::jsonb)
  FROM public.devices
  WHERE id = device_id_input
    AND user_id = auth.uid()
  LIMIT 1
$$;

-- Функція для оновлення налаштувань пристрою
CREATE OR REPLACE FUNCTION public.update_device_settings(
  device_id_input uuid,
  new_settings jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.devices
  SET settings = new_settings,
      updated_at = now()
  WHERE id = device_id_input
    AND user_id = auth.uid()
$$;