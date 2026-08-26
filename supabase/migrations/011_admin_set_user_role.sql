-- ============================================================
-- ADMIN USER ROLE MANAGEMENT
-- The profiles UPDATE RLS (WITH CHECK role = 'client') prevents
-- admins from modifying other users' roles via standard UPDATE.
-- This SECURITY DEFINER function bypasses the constraint safely.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id UUID,
  p_new_role        user_role
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: caller is not an admin';
  END IF;

  -- Prevent accidental self-lockout
  IF p_target_user_id = auth.uid() AND p_new_role = 'client' THEN
    RAISE EXCEPTION 'Forbidden: cannot demote yourself';
  END IF;

  UPDATE public.profiles
  SET role = p_new_role, updated_at = NOW()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_target_user_id;
  END IF;
END;
$$;
