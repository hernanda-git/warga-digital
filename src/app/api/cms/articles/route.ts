import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/cms/articles
 *
 * List articles with optional filters (status, search, pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    let query = supabase
      .from('articles')
      .select('*, article_images(id, url, alt_text, sort_order)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { data: articles, error, count } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articles: articles || [],
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/cms/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/articles
 *
 * Create a new article
 * Body: { title, slug?, excerpt?, content?, status?, featured_image_url?, author_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, status, featured_image_url, author_id } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const insertData: Record<string, unknown> = {
      title: title.trim(),
      author_id: author_id || session.userId,
    };

    if (slug) insertData.slug = slug;
    if (excerpt) insertData.excerpt = excerpt;
    if (content) insertData.content = content;
    if (status) insertData.status = status;
    if (featured_image_url) insertData.featured_image_url = featured_image_url;
    if (status === 'published') {
      insertData.published_at = new Date().toISOString();
    }

    const { data: article, error } = await supabase
      .from('articles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating article:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cms/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
