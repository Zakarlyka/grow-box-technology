-- Create get_my_role function to retrieve user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
    'user'::app_role
  )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;