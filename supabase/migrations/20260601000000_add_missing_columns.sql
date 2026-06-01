ALTER TABLE materia_encuentros
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'programado',
ADD COLUMN IF NOT EXISTS link text DEFAULT '',
ADD COLUMN IF NOT EXISTS link_grabacion text DEFAULT '',
ADD COLUMN IF NOT EXISTS "linkGrabacion" text DEFAULT '',
ADD COLUMN IF NOT EXISTS plataforma text DEFAULT 'Zoom',
ADD COLUMN IF NOT EXISTS "materiaId" text DEFAULT '';
