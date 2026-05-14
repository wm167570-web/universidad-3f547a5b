
-- Add IA credits fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creditos_disponibles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creditos_usados INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_recarga TIMESTAMPTZ;

-- Function: consume one IA credit, with daily refill (50/day) for non-super-admin.
-- Returns: remaining credits after consumption. Raises if exhausted.
CREATE OR REPLACE FUNCTION public.consume_ai_credit(_user_id UUID, _user_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _daily_quota CONSTANT INTEGER := 50;
  _disp INTEGER;
  _last TIMESTAMPTZ;
  _approved BOOLEAN;
BEGIN
  -- Super admin: unlimited, no consumption
  IF _user_email = 'wmartinezm360@gmail.com' THEN
    RETURN 999999;
  END IF;

  SELECT creditos_disponibles, ultima_recarga, is_approved
    INTO _disp, _last, _approved
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  IF NOT _approved THEN
    RAISE EXCEPTION 'Tu cuenta aún no está aprobada';
  END IF;

  -- Daily refill if last recharge was on a previous day (or never)
  IF _last IS NULL OR (_last AT TIME ZONE 'UTC')::date < (now() AT TIME ZONE 'UTC')::date THEN
    _disp := _daily_quota;
    UPDATE public.profiles
      SET creditos_disponibles = _daily_quota,
          ultima_recarga = now()
      WHERE user_id = _user_id;
  END IF;

  IF _disp <= 0 THEN
    RAISE EXCEPTION 'Créditos de IA agotados. Se recargarán mañana automáticamente.';
  END IF;

  UPDATE public.profiles
    SET creditos_disponibles = creditos_disponibles - 1,
        creditos_usados = creditos_usados + 1
    WHERE user_id = _user_id
    RETURNING creditos_disponibles INTO _disp;

  RETURN _disp;
END;
$$;

-- Function: initialize credits on approval (called when admin sets is_approved=true)
CREATE OR REPLACE FUNCTION public.init_credits_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = TRUE AND (OLD.is_approved IS DISTINCT FROM TRUE) THEN
    NEW.creditos_disponibles := 50;
    NEW.ultima_recarga := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_credits_on_approve ON public.profiles;
CREATE TRIGGER trg_init_credits_on_approve
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.init_credits_on_approve();
