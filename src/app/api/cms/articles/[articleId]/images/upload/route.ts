import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { serverUpload, getPublicUrl, generateObjectKey } from "@/lib/r2";
import type { ArticleImage } from "@/types/article-image";

type RouteContext = { params: Promise<{ articleId: string }> };

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/avif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Verify article exists and user has access
    const { data: article } = await supabase
      .from("articles")
      .select("id, author_id")
      .eq("id", articleId)
      .is("deleted_at", null)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (article.author_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const isFeatured = formData.get("featured") === "true";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    // If featured mode, only process the first file and don't create a gallery record
    if (isFeatured) {
      const file = files[0];

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max 10MB.` },
          { status: 400 },
        );
      }

      const objectKey = generateObjectKey(articleId, file.name);
      const buffer = new Uint8Array(await file.arrayBuffer());
      await serverUpload(buffer, objectKey, file.type);
      const publicUrl = getPublicUrl(objectKey);

      return NextResponse.json({ url: publicUrl, objectKey });
    }

    // Gallery mode: upload multiple files and create records
    const uploadedImages: ArticleImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        continue;
      }

      try {
        const objectKey = generateObjectKey(articleId, file.name);
        const buffer = new Uint8Array(await file.arrayBuffer());
        await serverUpload(buffer, objectKey, file.type);
        const publicUrl = getPublicUrl(objectKey);

        const { data: nextOrder } = await supabase
          .from("article_images")
          .select("sort_order")
          .eq("article_id", articleId)
          .order("sort_order", { ascending: false })
          .limit(1);

        const sortOrder = (nextOrder?.[0]?.sort_order ?? -1) + 1;

        const { data: image, error: insertError } = await supabase
          .from("article_images")
          .insert({
            article_id: articleId,
            object_key: objectKey,
            url: publicUrl,
            mime_type: file.type,
            size_bytes: file.size,
            width: null,
            height: null,
            alt_text: "",
            sort_order: sortOrder,
          })
          .select()
          .single();

        if (insertError) continue;

        uploadedImages.push(image);
      } catch {
        continue;
      }
    }

    return NextResponse.json({ images: uploadedImages }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
