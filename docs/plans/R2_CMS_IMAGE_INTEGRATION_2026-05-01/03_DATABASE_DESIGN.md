warga-digital\docs\plans\R2_CMS_IMAGE_INTEGRATION_2026-05-01\03_DATABASE_DESIGN.md
```

```markdown
# Sub-Plan 03: Database Design — Article Images Table

## Objective

Create the `article_images` table in Supabase to store R2-hosted image metadata, keeping image records decoupled from article content while maintaining referential integrity.

---

## 1. Supabase Migration File

Create a new migration file in `supabase/migrations/`:

**File:** `supabase/migrations/20260501_create_article_images.sql`

```sql
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

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER update_article_images_updated_at
  BEFORE UPDATE ON public.article_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. TypeScript Type Definition

**File:** `src/types/article-image.ts` (or add to existing types file)

```typescript
export interface ArticleImage {
  id: string;
  article_id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleImageCreate {
  article_id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string | null;
  sort_order?: number;
}

export interface ArticleImageUpdate {
  object_key?: string;
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string | null;
  sort_order?: number;
}
```

---

## 3. Supabase Client Helper Functions

**File:** `src/lib/supabase/article-images.ts`

```typescript
import { supabase } from '@/lib/supabase/client';
import type { ArticleImage, ArticleImageCreate, ArticleImageUpdate } from '@/types/article-image';

export async function getArticleImages(articleId: string): Promise<ArticleImage[]> {
  const { data, error } = await supabase
    .from('article_images')
    .select('*')
    .eq('article_id', articleId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createArticleImage(image: ArticleImageCreate): Promise<ArticleImage> {
  const { data, error } = await supabase
    .from('article_images')
    .insert(image)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createArticleImages(images: ArticleImageCreate[]): Promise<ArticleImage[]> {
  const { data, error } = await supabase
    .from('article_images')
    .insert(images)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateArticleImage(
  id: string,
  updates: ArticleImageUpdate
): Promise<ArticleImage> {
  const { data, error } = await supabase
    .from('article_images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteArticleImage(id: string): Promise<void> {
  const { error } = await supabase
    .from('article_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteArticleImages(articleId: string): Promise<string[]> {
  // First get all object_keys for R2 cleanup
  const images = await getArticleImages(articleId);
  const objectKeys = images.map(img => img.object_key);

  const { error } = await supabase
    .from('article_images')
    .delete()
    .eq('article_id', articleId);

  if (error) throw error;
  return objectKeys;
}

export async function reorderArticleImages(
  articleId: string,
  imageIds: string[]
): Promise<void> {
  const updates = imageIds.map((id, index) =>
    supabase
      .from('article_images')
      .update({ sort_order: index })
      .eq('id', id)
  );

  await Promise.all(updates);
}
```

---

## 4. Integration Checklist

- [ ] Create migration file in `supabase/migrations/`
- [ ] Run migration against local Supabase
- [ ] Verify table created with proper indexes
- [ ] Add TypeScript types to project
- [ ] Create Supabase helper functions
- [ ] Export helpers from `src/lib/supabase/index.ts`
- [ ] Update any existing article-related code to use new table
- [ ] Test CRUD operations in Supabase dashboard

---

## 5. Dependencies

- Requires: `supabase` client initialized in project
- Uses: existing `articles` table reference

---

## 6. Notes

- The table uses `ON DELETE CASCADE` so images are auto-deleted when article is deleted
- `object_key` stored for R2 cleanup operations (orphan deletion)
- `url` field holds the full R2 public URL for easy rendering
- `sort_order` enables manual reordering in CMS editor