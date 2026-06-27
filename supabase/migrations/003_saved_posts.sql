-- ============================================================================
-- TOO HUMBLE - MIGRATION 003: SAVED POSTS
-- Adds saved_posts junction table (user ↔ home_feed many-to-many)
-- RLS: users can read/insert/delete their own saved posts only
-- ============================================================================

-- ============================================================================
-- TABLE: saved_posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id    UUID REFERENCES public.home_feed(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Saved Posts"   ON public.saved_posts;
DROP POLICY IF EXISTS "Users Manage Own Saved Posts" ON public.saved_posts;

-- SELECT: only the owner sees their own bookmarks
CREATE POLICY "Users Read Own Saved Posts"
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT + DELETE: owner only, no admin override needed
CREATE POLICY "Users Manage Own Saved Posts"
  ON public.saved_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
