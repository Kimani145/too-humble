-- =============================================================================
-- TOO HUMBLE - MIGRATION 007: Rate Limiting & Audit Logging
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_id      UUID,
  target_table   TEXT,
  ip_address     TEXT,
  correlation_id TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id  ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action    ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
CREATE POLICY "audit_log_admin_read" ON public.audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rate limiting table (Postgres-backed, no Redis dependency)
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action_time
  ON public.rate_limit_log(user_id, action, created_at DESC);
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
-- No client access — only service role (edge functions) writes to this

-- Function: check and record a rate-limited action
-- Returns TRUE if action is ALLOWED, FALSE if rate limit exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action  TEXT,
  p_max     INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - (p_window_seconds * INTERVAL '1 second');
  IF v_count >= p_max THEN RETURN FALSE; END IF;
  INSERT INTO public.rate_limit_log(user_id, action) VALUES (p_user_id, p_action);
  RETURN TRUE;
END;
$$;

-- Fix SECURITY DEFINER search_path on trigger functions
-- handle_new_user_sync
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous Identity'),
    'client'::user_role
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- sync_feed_reaction_count
CREATE OR REPLACE FUNCTION public.sync_feed_reaction_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.home_feed SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.home_feed SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
