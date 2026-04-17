-- Create article_images table for R2-hosted CMS article images
CREATE TABLE IF NOT EXISTS public.article_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INT,
  height INT,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_article_images_article_id ON public.article_images(article_id);
CREATE INDEX idx_article_images_sort_order ON public.article_images(article_id, sort_order);

-- Enable RLS
ALTER TABLE public.article_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read images
CREATE POLICY "Public read access" ON public.article_images
  FOR SELECT USING (true);

-- RLS Policy: Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage images" ON public.article_images
  FOR ALL USING (auth.role() = 'authenticated');

-- Attach trigger (function is created in articles migration)
CREATE TRIGGER update_article_images_updated_at
  BEFORE UPDATE ON public.article_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
