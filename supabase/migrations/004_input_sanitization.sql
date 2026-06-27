-- ============================================================================
-- TOO HUMBLE - MIGRATION 004: INPUT SANITIZATION TRIGGERS
-- Strips XSS vectors and null bytes from community_posts.caption
-- and profiles.full_name at the database level.
-- This is the last line of defense — client-side validation is cosmetic.
-- ============================================================================

-- ============================================================================
-- FUNCTION: sanitize_text_input
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sanitize_text_input()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'community_posts' THEN
    -- Strip null bytes (PostgreSQL chokes on chr(0))
    NEW.caption := REPLACE(COALESCE(NEW.caption, ''), chr(0), '');
    -- Strip inline <script> blocks
    NEW.caption := REGEXP_REPLACE(NEW.caption, '<script[^>]*>.*?</script>', '', 'gi');
    -- Strip javascript: protocol injections
    NEW.caption := REGEXP_REPLACE(NEW.caption, 'javascript:', '', 'gi');
    -- Strip on* event attributes (e.g. onclick=, onmouseover=)
    NEW.caption := REGEXP_REPLACE(NEW.caption, ' on\w+\s*=\s*"[^"]*"', '', 'gi');
    NEW.caption := REGEXP_REPLACE(NEW.caption, ' on\w+\s*=\s*''[^'']*''', '', 'gi');
  END IF;

  IF TG_TABLE_NAME = 'profiles' THEN
    -- Strip null bytes
    NEW.full_name := REPLACE(COALESCE(NEW.full_name, ''), chr(0), '');
    -- Strip all HTML tags
    NEW.full_name := REGEXP_REPLACE(NEW.full_name, '<[^>]+>', '', 'g');
    -- Trim excess whitespace
    NEW.full_name := TRIM(REGEXP_REPLACE(NEW.full_name, '\s+', ' ', 'g'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: community_posts — on INSERT and UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS sanitize_community_posts_input ON public.community_posts;
CREATE TRIGGER sanitize_community_posts_input
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_text_input();

-- ============================================================================
-- TRIGGER: profiles — on INSERT and UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS sanitize_profiles_input ON public.profiles;
CREATE TRIGGER sanitize_profiles_input
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_text_input();
