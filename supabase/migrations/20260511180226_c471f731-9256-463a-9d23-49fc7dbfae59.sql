CREATE POLICY "Super admin deletes profiles"
ON public.profiles
FOR DELETE
USING ((auth.jwt() ->> 'email') = 'wmartinezm360@gmail.com');