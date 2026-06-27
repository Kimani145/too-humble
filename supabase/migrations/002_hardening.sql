-- ============================================================================
-- TOO HUMBLE - MIGRATION 002: HARDENING & SECURITY PATTERNS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Alter Column Types and Defaults
-- ----------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ALTER COLUMN file_size_kb TYPE INT;

ALTER TABLE public.monetization_ledger
  ALTER COLUMN currency SET DEFAULT 'USD';

-- ----------------------------------------------------------------------------
-- 2. Apply CHECK Constraints
-- ----------------------------------------------------------------------------

-- public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT check_name_length
  CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 100);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_facebook_format;
ALTER TABLE public.profiles ADD CONSTRAINT check_facebook_format
  CHECK (fb_link IS NULL OR fb_link SIMILAR TO 'https://(www\.)?facebook\.com/[A-Za-z0-9\._\-]+');

-- public.home_feed
ALTER TABLE public.home_feed DROP CONSTRAINT IF EXISTS check_title_length;
ALTER TABLE public.home_feed ADD CONSTRAINT check_title_length
  CHECK (char_length(title) <= 255);

ALTER TABLE public.home_feed DROP CONSTRAINT IF EXISTS check_media_url_format;
ALTER TABLE public.home_feed ADD CONSTRAINT check_media_url_format
  CHECK (media_url IS NULL OR media_url SIMILAR TO 'https://.+');

ALTER TABLE public.home_feed DROP CONSTRAINT IF EXISTS check_ref_length;
ALTER TABLE public.home_feed ADD CONSTRAINT check_ref_length
  CHECK (author_reference IS NULL OR char_length(author_reference) <= 150);

ALTER TABLE public.home_feed DROP CONSTRAINT IF EXISTS check_positive_reactions;
ALTER TABLE public.home_feed ADD CONSTRAINT check_positive_reactions
  CHECK (reaction_count >= 0);

-- public.community_posts
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_image_url_format;
ALTER TABLE public.community_posts ADD CONSTRAINT check_image_url_format
  CHECK (image_url IS NULL OR image_url SIMILAR TO 'https://.+');

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_caption_length;
ALTER TABLE public.community_posts ADD CONSTRAINT check_caption_length
  CHECK (caption IS NULL OR char_length(caption) <= 2200);

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_max_five_megabytes;
ALTER TABLE public.community_posts ADD CONSTRAINT check_max_five_megabytes
  CHECK (file_size_kb IS NULL OR (file_size_kb > 0 AND file_size_kb <= 5120));

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_post_has_content;
ALTER TABLE public.community_posts ADD CONSTRAINT check_post_has_content
  CHECK (image_url IS NOT NULL OR (caption IS NOT NULL AND char_length(caption) > 0));

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_image_requires_size;
ALTER TABLE public.community_posts ADD CONSTRAINT check_image_requires_size
  CHECK (image_url IS NULL OR file_size_kb IS NOT NULL);

-- public.monetization_ledger
ALTER TABLE public.monetization_ledger DROP CONSTRAINT IF EXISTS check_positive_amount;
ALTER TABLE public.monetization_ledger ADD CONSTRAINT check_positive_amount
  CHECK (amount > 0);

-- ----------------------------------------------------------------------------
-- 3. Update RLS Policies
-- ----------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner Identity Updates Only" ON public.profiles;

CREATE POLICY "Public Read Profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Owner Identity Updates Only"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'client');

-- home_feed
DROP POLICY IF EXISTS "home_feed_public_read" ON public.home_feed;
DROP POLICY IF EXISTS "home_feed_admin_all" ON public.home_feed;
DROP POLICY IF EXISTS "Authenticated Users Can Read Home Feed" ON public.home_feed;
DROP POLICY IF EXISTS "Omnipotent Admin Control Over Home Feed" ON public.home_feed;

CREATE POLICY "Authenticated Users Can Read Home Feed"
  ON public.home_feed FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Omnipotent Admin Control Over Home Feed"
  ON public.home_feed FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- community_posts
DROP POLICY IF EXISTS "community_posts_auth_read" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_owner_insert" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_owner_update" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_owner_delete" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_admin_all" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated Users Can View Community Posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users Can Insert Own Posts Only" ON public.community_posts;
DROP POLICY IF EXISTS "Users Can Delete Own Unflagged Posts" ON public.community_posts;
DROP POLICY IF EXISTS "Admins Override Community Content" ON public.community_posts;

CREATE POLICY "Authenticated Users Can View Community Posts"
  ON public.community_posts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users Can Insert Own Posts Only"
  ON public.community_posts FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users Can Delete Own Unflagged Posts"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id AND is_flagged = false);

CREATE POLICY "Admins Override Community Content"
  ON public.community_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- monetization_ledger
DROP POLICY IF EXISTS "ledger_owner_read" ON public.monetization_ledger;
DROP POLICY IF EXISTS "ledger_owner_insert" ON public.monetization_ledger;
DROP POLICY IF EXISTS "ledger_admin_all" ON public.monetization_ledger;
DROP POLICY IF EXISTS "Users Read Own Ledger" ON public.monetization_ledger;

CREATE POLICY "Users Read Own Ledger"
  ON public.monetization_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- post_reactions
DROP POLICY IF EXISTS "reactions_auth_read" ON public.post_reactions;
DROP POLICY IF EXISTS "reactions_owner_insert" ON public.post_reactions;
DROP POLICY IF EXISTS "reactions_owner_delete" ON public.post_reactions;
DROP POLICY IF EXISTS "Authenticated Read Reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users Manage Own Reactions" ON public.post_reactions;

CREATE POLICY "Authenticated Read Reactions"
  ON public.post_reactions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users Manage Own Reactions"
  ON public.post_reactions FOR ALL USING (auth.uid() = user_id);

-- community_reactions
DROP POLICY IF EXISTS "community_reactions_auth_read" ON public.community_reactions;
DROP POLICY IF EXISTS "community_reactions_owner_insert" ON public.community_reactions;
DROP POLICY IF EXISTS "community_reactions_owner_delete" ON public.community_reactions;
DROP POLICY IF EXISTS "Authenticated Read Community Reactions" ON public.community_reactions;
DROP POLICY IF EXISTS "Users Manage Own Community Reactions" ON public.community_reactions;

CREATE POLICY "Authenticated Read Community Reactions"
  ON public.community_reactions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users Manage Own Community Reactions"
  ON public.community_reactions FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Cleanup and Recreate Triggers & Functions
-- ----------------------------------------------------------------------------

-- User Sync Trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_sync();

CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous Identity'),
    'client'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();

-- Reaction Sync Trigger
DROP TRIGGER IF EXISTS trg_sync_feed_reactions ON public.post_reactions;
DROP TRIGGER IF EXISTS on_post_reaction_change ON public.post_reactions;
DROP FUNCTION IF EXISTS public.sync_feed_reaction_count();

CREATE OR REPLACE FUNCTION public.sync_feed_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.home_feed SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.home_feed
    SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_reaction_change
  AFTER INSERT OR DELETE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_reaction_count();

-- Auto-update updated_at Trigger
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_home_feed_updated_at ON public.home_feed;
DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON public.community_posts;
DROP TRIGGER IF EXISTS trg_monetization_ledger_updated_at ON public.monetization_ledger;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_home_feed_updated_at ON public.home_feed;
DROP TRIGGER IF EXISTS set_community_posts_updated_at ON public.community_posts;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_home_feed_updated_at
  BEFORE UPDATE ON public.home_feed FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
