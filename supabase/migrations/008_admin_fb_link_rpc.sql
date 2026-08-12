-- =============================================================================
-- TOO HUMBLE - MIGRATION 008: Admin Facebook Link Update RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_fb_link(p_fb_link TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  -- Validate format (mirrors the CHECK constraint)
  IF p_fb_link IS NOT NULL AND p_fb_link !~ '^https://(www\.)?facebook\.com/[A-Za-z0-9\._\-]+$' THEN
    RAISE EXCEPTION 'Invalid Facebook URL format';
  END IF;
  UPDATE public.profiles
  SET fb_link = p_fb_link
  WHERE id = auth.uid();
END;
$$;
