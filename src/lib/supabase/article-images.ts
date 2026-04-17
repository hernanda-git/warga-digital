import { supabase } from "@/lib/supabase/client";
import type {
  ArticleImage,
  ArticleImageCreate,
  ArticleImageUpdate,
} from "@/types/article-image";

/**
 * Fetches all images associated with a specific article, ordered by sort_order.
 */
export async function getArticleImages(
  articleId: string,
): Promise<ArticleImage[]> {
  const { data, error } = await supabase
    .from("article_images")
    .select("*")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a single new article image record.
 */
export async function createArticleImage(
  image: ArticleImageCreate,
): Promise<ArticleImage> {
  const { data, error } = await supabase
    .from("article_images")
    .insert(image)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates multiple article image records in a single transaction.
 */
export async function createArticleImages(
  images: ArticleImageCreate[],
): Promise<ArticleImage[]> {
  const { data, error } = await supabase
    .from("article_images")
    .insert(images)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Updates an existing article image record.
 */
export async function updateArticleImage(
  id: string,
  updates: ArticleImageUpdate,
): Promise<ArticleImage> {
  const { data, error } = await supabase
    .from("article_images")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a single article image record.
 */
export async function deleteArticleImage(id: string): Promise<void> {
  const { error } = await supabase.from("article_images").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Deletes all images associated with an article and returns their object keys.
 * The returned object keys should be used for cleaning up files in R2.
 */
export async function deleteArticleImages(
  articleId: string,
): Promise<string[]> {
  // First get all object_keys for R2 cleanup
  const images = await getArticleImages(articleId);
  const objectKeys = images.map((img) => img.object_key);

  const { error } = await supabase
    .from("article_images")
    .delete()
    .eq("article_id", articleId);

  if (error) throw error;
  return objectKeys;
}

/**
 * Reorders article images based on a new array of IDs.
 * The index in the array determines the new sort_order.
 */
export async function reorderArticleImages(
  articleId: string,
  imageIds: string[],
): Promise<void> {
  const updates = imageIds.map((id, index) =>
    supabase.from("article_images").update({ sort_order: index }).eq("id", id),
  );

  // Note: Using Promise.all for concurrent updates.
  // For very large sets, consider batching or a single RPC call.
  await Promise.all(updates);
}
