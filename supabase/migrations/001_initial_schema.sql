-- =============================================================================
-- TOO HUMBLE - CONSOLIDATED SUPABASE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor once per environment
-- =============================================================================

-- -----------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------
-- CUSTOM ENUM TYPES
-- -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('client', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_type AS ENUM ('quote', 'video', 'verse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_gateway AS ENUM ('daraja', 'paypal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- TABLE: public.profiles
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT        NOT NULL DEFAULT '',
  role         public.user_role NOT NULL DEFAULT 'client',
  avatar_url   TEXT,
  fb_link      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- TABLE: public.home_feed
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_feed (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type     public.content_type NOT NULL,
  title            TEXT          NOT NULL,
  media_url        TEXT,
  author_reference TEXT          NOT NULL DEFAULT 'Too Humble',
  body_text        TEXT,
  reaction_count   INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- TABLE: public.community_posts
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url    TEXT,
  caption      TEXT          NOT NULL DEFAULT '',
  file_size_kb DECIMAL(10,2),
  is_flagged   BOOLEAN       NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- TABLE: public.monetization_ledger
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monetization_ledger (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_gateway  public.payment_gateway  NOT NULL,
  amount           DECIMAL(12,2)           NOT NULL,
  status           public.payment_status   NOT NULL DEFAULT 'pending',
  reference_id     TEXT                    NOT NULL,
  phone_number     TEXT,
  currency         TEXT                    NOT NULL DEFAULT 'KES',
  metadata         JSONB,
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- TABLE: public.post_reactions (likes/reactions on home_feed)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id   UUID        NOT NULL REFERENCES public.home_feed(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- -----------------------------------------------------------------------
-- TABLE: public.community_reactions (likes on community posts)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id   UUID        NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- -----------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_home_feed_reaction_count  ON public.home_feed(reaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_home_feed_created_at      ON public.home_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id   ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_flagged ON public.community_posts(is_flagged);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id            ON public.monetization_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id       ON public.monetization_ledger(reference_id);

-- -----------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- -----------------------------------------------------------------------

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_home_feed_updated_at ON public.home_feed;
CREATE TRIGGER trg_home_feed_updated_at
  BEFORE UPDATE ON public.home_feed
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_monetization_ledger_updated_at ON public.monetization_ledger;
CREATE TRIGGER trg_monetization_ledger_updated_at
  BEFORE UPDATE ON public.monetization_ledger
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'client',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-sync reaction_count on home_feed
CREATE OR REPLACE FUNCTION public.sync_feed_reaction_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.home_feed SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.home_feed SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feed_reactions ON public.post_reactions;
CREATE TRIGGER trg_sync_feed_reactions
  AFTER INSERT OR DELETE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_reaction_count();

-- -----------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_feed         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- RLS HELPER FUNCTION
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.profiles
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_public_read"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"      ON public.profiles;

-- Anyone (including anon) can read profiles
CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  USING (true);

-- Owner can update own profile
CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin has full CRUD
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Auth users can insert own profile (used by trigger)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.home_feed
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "home_feed_public_read"  ON public.home_feed;
DROP POLICY IF EXISTS "home_feed_admin_all"    ON public.home_feed;

-- Authenticated clients can read all
CREATE POLICY "home_feed_public_read"
  ON public.home_feed FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins have full CRUD
CREATE POLICY "home_feed_admin_all"
  ON public.home_feed FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.community_posts
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "community_posts_auth_read"    ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_owner_write"  ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_admin_all"    ON public.community_posts;

-- Authenticated users can read all community posts
CREATE POLICY "community_posts_auth_read"
  ON public.community_posts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Owner can insert and update their own posts
CREATE POLICY "community_posts_owner_insert"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_posts_owner_update"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can delete own posts
CREATE POLICY "community_posts_owner_delete"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Admins have full CRUD (moderation)
CREATE POLICY "community_posts_admin_all"
  ON public.community_posts FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.monetization_ledger
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "ledger_owner_read"   ON public.monetization_ledger;
DROP POLICY IF EXISTS "ledger_admin_all"    ON public.monetization_ledger;

-- Users can only view their own ledger entries
CREATE POLICY "ledger_owner_read"
  ON public.monetization_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own ledger entries (initiated client side)
CREATE POLICY "ledger_owner_insert"
  ON public.monetization_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins have full visibility and management
CREATE POLICY "ledger_admin_all"
  ON public.monetization_ledger FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.post_reactions
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "reactions_auth_read"    ON public.post_reactions;
DROP POLICY IF EXISTS "reactions_owner_write"  ON public.post_reactions;

CREATE POLICY "reactions_auth_read"
  ON public.post_reactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "reactions_owner_insert"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_owner_delete"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- RLS POLICIES: public.community_reactions
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "community_reactions_auth_read"   ON public.community_reactions;
DROP POLICY IF EXISTS "community_reactions_owner_write" ON public.community_reactions;

CREATE POLICY "community_reactions_auth_read"
  ON public.community_reactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "community_reactions_owner_insert"
  ON public.community_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_reactions_owner_delete"
  ON public.community_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- STORAGE BUCKETS
-- -----------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-uploads',
  'community-uploads',
  false,
  5242880, -- 5MB hard limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152 -- 2MB
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "community_uploads_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_uploads_owner_read"  ON storage.objects;
DROP POLICY IF EXISTS "community_uploads_admin_delete" ON storage.objects;

CREATE POLICY "community_uploads_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-uploads'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "community_uploads_auth_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'community-uploads'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "community_uploads_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community-uploads'
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- -----------------------------------------------------------------------
-- REALTIME SUBSCRIPTIONS
-- -----------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.home_feed;
