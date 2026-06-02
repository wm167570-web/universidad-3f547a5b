ALTER TABLE public.materia_encuentros 
  ADD COLUMN IF NOT EXISTS plataforma text DEFAULT 'Teams',
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'programado';