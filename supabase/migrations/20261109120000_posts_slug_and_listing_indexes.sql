-- posts.slug was declared UNIQUE in the first migration, but the live database
-- has no index on it (only posts_pkey): every post lookup by slug was a
-- sequential scan. Restore it, plus one for the published-by-category listings
-- that the homepage, category pages and related-post blocks all run.
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON public.posts (slug);

CREATE INDEX IF NOT EXISTS posts_category_published_created_idx
  ON public.posts (category_id, created_at DESC)
  WHERE published;
