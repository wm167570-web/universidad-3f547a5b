
-- 1. Trigger automático para crear perfil + rol al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Policies adicionales para que el admin vea/edite todos los perfiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR (auth.jwt() ->> 'email') = 'wmartinezm360@gmail.com'
);

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
ON public.profiles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR (auth.jwt() ->> 'email') = 'wmartinezm360@gmail.com'
);

-- 3. Asegurar rol admin para el super-admin si ya existe en auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'wmartinezm360@gmail.com'
ON CONFLICT DO NOTHING;

-- 4. Crear perfiles para usuarios existentes que aún no tengan uno
INSERT INTO public.profiles (user_id, display_name, is_approved)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
       CASE WHEN u.email = 'wmartinezm360@gmail.com' THEN true ELSE false END
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 5. Realtime para profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
