
REVOKE ALL ON FUNCTION public.consume_ai_credit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.init_credits_on_approve() FROM PUBLIC, anon, authenticated;
