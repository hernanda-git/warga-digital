import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * POST /api/cms/articles/[articleId]/images/batch
 *
 * Insert multiple image records for an article in a single call.
 * Used after R2 uploads complete to associate all gallery images at once.
 *
 * Request body:
 * {
 *   images: Array<{
 *     object_key: string;    // R2 S3 key, e.g. "articles/uuid/2026/01/img-xxx.jpg"
 *     url: string;           // Full public URL, e.g. "https://oo.warga-digital.com/articles/uuid/..."
 *     mime_type: string;     // e.g. "image/jpeg"
 *     alt_text?: string;     // Optional alt text
 *     sort_order: number;    // Sequence index (0-based)
 *   }>;
 * }
 *
 * Response (201 Created):
 * {
 *   images: Array<{
 *     id: string;
 *     url: string;
 *     object_key: string;
 *     sort_order: number;
 *   }>;
 * }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { images } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'images must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each image entry
    for (const img of images) {
      if (!img.object_key || !img.url || !img.mime_type || img.sort_order === undefined) {
        return NextResponse.json(
          { error: 'Each image requires object_key, url, mime_type, and sort_order' },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', articleId)
      .is('deleted_at', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Build insert rows
    const insertRows = images.map((img) => ({
      article_id: articleId,
      object_key: img.object_key,
      url: img.url,
      mime_type: img.mime_type,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order,
    }));

    const { data: insertedImages, error: insertError } = await supabase
      .from('article_images')
      .insert(insertRows)
      .select('id, url, object_key, sort_order, alt_text');

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create image records' },
        { status: 500 }
      );
    }

    return NextResponse.json({ images: insertedImages }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
