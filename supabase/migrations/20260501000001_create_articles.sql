-- Create articles table for CMS content management
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image_url TEXT,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

-- Index for efficient queries
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_author_id ON public.articles(author_id);
CREATE INDEX idx_articles_published_at ON public.articles(published_at);
CREATE INDEX idx_articles_deleted_at ON public.articles(deleted_at);
CREATE INDEX idx_articles_created_by ON public.articles(created_by);
CREATE INDEX idx_articles_updated_by ON public.articles(updated_by);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read published articles (excluding soft-deleted)
CREATE POLICY "Public read access for published articles" ON public.articles
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- RLS Policy: Authenticated users can read draft articles they authored (excluding soft-deleted)
CREATE POLICY "Authors can read their own drafts" ON public.articles
  FOR SELECT USING (auth.role() = 'authenticated' AND author_id = auth.uid() AND deleted_at IS NULL);

-- RLS Policy: Only authenticated users can insert articles
CREATE POLICY "Authenticated users can create articles" ON public.articles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authors can update their own articles
CREATE POLICY "Authors can update their own articles" ON public.articles
  FOR UPDATE USING (auth.role() = 'authenticated' AND author_id = auth.uid() AND deleted_at IS NULL);

-- RLS Policy: Authors can soft-delete their own articles
CREATE POLICY "Authors can soft-delete their own articles" ON public.articles
  FOR UPDATE USING (auth.role() = 'authenticated' AND author_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (auth.role() = 'authenticated' AND deleted_at IS NOT NULL);

-- Updated_at and updated_by trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Created_by trigger function
CREATE OR REPLACE FUNCTION set_created_by_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER set_articles_created_by
  BEFORE INSERT ON public.articles
  FOR EACH ROW EXECUTE FUNCTION set_created_by_column();

-- Function to generate unique slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(title), '[^a-zA-Z0-9\s-]', '', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug from title if not provided
CREATE OR REPLACE FUNCTION set_article_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_article_slug_trigger
  BEFORE INSERT ON public.articles
  FOR EACH ROW EXECUTE FUNCTION set_article_slug();
