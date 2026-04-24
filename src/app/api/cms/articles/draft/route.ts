import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/cms/articles/draft
 *
 * Creates a minimal draft article placeholder and returns its real UUID.
 * Use this when you need an article_id for image operations before the user
 * has explicitly saved a real article.
 *
 * The placeholder is upgraded to a real article on first publish/save.
 * If the user abandons the compose page without publishing, the draft
 * article remains orphaned — cleanup is handled by the orphan cleanup job.
 *
 * Request body (all optional):
 * {
 *   temp_title?: string;   // UI label only, not saved to DB
 * }
 *
 * Response (201 Created):
 * {
 *   article_id: string;    // real UUID, e.g. "a1b2c3d4-..."
 *   is_draft: true;
 *   created_at: string;     // ISO timestamp
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { temp_title } = body;

    const supabase = createServerClient();

    const insertData: Record<string, unknown> = {
      title: 'Untitled', // Placeholder title — will be overwritten on real save
      author_id: session.userId,
      status: 'draft',
    };

    // temp_title is UI-only metadata, NOT stored in DB.
    // It is passed so the UI can display "Drafting: {temp_title}" while composing.
    // The real title is set when the user saves/publishes.

    const { data: article, error } = await supabase
      .from('articles')
      .insert(insertData)
      .select('id, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create draft article' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        article_id: article.id,
        is_draft: true,
        created_at: article.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
