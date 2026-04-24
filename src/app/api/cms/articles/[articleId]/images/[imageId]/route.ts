import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { deleteObject } from '@/lib/r2';

type RouteContext = {
  params: Promise<{ articleId: string; imageId: string }>
};

/**
 * GET /api/cms/articles/[articleId]/images/[imageId]
 *
 * Fetch a single image by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { articleId, imageId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: image, error } = await supabase
      .from('article_images')
      .select('*')
      .eq('id', imageId)
      .eq('article_id', articleId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cms/articles/[articleId]/images/[imageId]
 *
 * Update image metadata (alt text, sort order)
 * Body: { alt_text?: string, sort_order?: number }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { articleId, imageId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alt_text, sort_order } = body;

    // Validate that at least one field is provided
    if (alt_text === undefined && sort_order === undefined) {
      return NextResponse.json(
        { error: 'No fields to update. Provide alt_text or sort_order' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (alt_text !== undefined) updates.alt_text = alt_text;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    updates.updated_at = new Date().toISOString();

    const { data: updatedImage, error } = await supabase
      .from('article_images')
      .update(updates)
      .eq('id', imageId)
      .eq('article_id', articleId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: updatedImage });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/articles/[articleId]/images/[imageId]
 *
 * Delete a single image from both R2 and database
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { articleId, imageId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // 1. Fetch image to get object key before deletion
    const { data: image, error: fetchError } = await supabase
      .from('article_images')
      .select('object_key')
      .eq('id', imageId)
      .eq('article_id', articleId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // 2. Delete from R2
    let r2DeleteError: Error | null = null;
    try {
      await deleteObject(image.object_key);
    } catch (error) {
      r2DeleteError = error instanceof Error ? error : new Error('R2 delete failed');
      // Continue with DB deletion even if R2 fails
    }

    // 3. Delete from database
    const { error: deleteError } = await supabase
      .from('article_images')
      .delete()
      .eq('id', imageId)
      .eq('article_id', articleId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete image from database' },
        { status: 500 }
      );
    }

    // 4. Return success with any R2 errors for monitoring
    return NextResponse.json({
      success: true,
      r2Error: r2DeleteError?.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
