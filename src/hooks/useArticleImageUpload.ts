import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createServerClient } from "@/lib/supabase/server";
import type { ArticleImage, ArticleImageCreate } from "@/types/article-image";

export interface UploadProgress {
  id: string;
  fileName: string;
  status: "pending" | "uploading" | "success" | "failed";
  progress: number;
  error?: string;
  imageUrl?: string;
}

interface UseArticleImageUploadOptions {
  articleId: string;
  onSuccess?: (images: ArticleImage[]) => void;
  onError?: (error: Error) => void;
}

export function useArticleImageUpload({
  articleId,
  onSuccess,
  onError,
}: UseArticleImageUploadOptions) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const uploadSingleImage = useCallback(
    async (file: File, uploadId: string): Promise<ArticleImage | null> => {
      const abortController = new AbortController();
      abortControllersRef.current.set(uploadId, abortController);

      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: "uploading", progress: 0 } : u,
          ),
        );

        // Step 1: Request signed URL
        const response = await fetch("/api/cms/articles/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            articleId,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { uploadUrl, publicUrl, objectKey } = await response.json();

        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 30 } : u)),
        );

        // Step 2: Upload to R2 with progress tracking
        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = 30 + Math.round((e.loaded / e.total) * 70);
              setUploads((prev) =>
                prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)),
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        abortController.signal.addEventListener("abort", () => {
          xhr.abort();
        });

        await uploadPromise;

        // Step 3: Get image dimensions
        const dimensions = await getImageDimensions(file);

        // Step 4: Save metadata to Supabase
        const supabase = createServerClient();
        const imageData: ArticleImageCreate = {
          article_id: articleId,
          object_key: objectKey,
          url: publicUrl,
          mime_type: file.type,
          size_bytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          alt_text: "",
          sort_order: uploads.length,
        };

        const { data: savedImage, error: saveError } = await supabase
          .from("article_images")
          .insert(imageData)
          .select()
          .single();

        if (saveError) {
          throw new Error(
            `Failed to save image metadata: ${saveError.message}`,
          );
        }

        // Success
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: "success",
                  progress: 100,
                  imageUrl: publicUrl,
                }
              : u,
          ),
        );

        return savedImage;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: "failed",
                  error: errorMessage,
                }
              : u,
          ),
        );
        toast.error(`${file.name}: ${errorMessage}`);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      } finally {
        abortControllersRef.current.delete(uploadId);
      }
    },
    [articleId, uploads.length, onError],
  );

  const uploadImages = useCallback(
    async (files: File[]): Promise<ArticleImage[]> => {
      if (files.length === 0) return [];

      setIsUploading(true);

      // Initialize upload progress
      const newUploads: UploadProgress[] = files.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        status: "pending" as const,
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      try {
        // Upload files sequentially to maintain sort order
        const uploadedImages: ArticleImage[] = [];
        for (let i = 0; i < files.length; i++) {
          const result = await uploadSingleImage(files[i], newUploads[i].id);
          if (result) {
            uploadedImages.push(result);
          }
        }

        if (uploadedImages.length > 0) {
          onSuccess?.(uploadedImages);
          toast.success(
            `${uploadedImages.length} image(s) uploaded successfully`,
          );
        }

        return uploadedImages;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Some uploads failed. Please retry failed files.");
        return [];
      } finally {
        setIsUploading(false);
      }
    },
    [uploadSingleImage, onSuccess],
  );

  const cancelUpload = useCallback((uploadId: string) => {
    const abortController = abortControllersRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: "failed", error: "Cancelled" }
            : u,
        ),
      );
    }
  }, []);

  const retryUpload = useCallback(
    async (uploadId: string, file: File) => {
      const result = await uploadSingleImage(file, uploadId);
      return result !== null;
    },
    [uploadSingleImage],
  );

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const removeUpload = useCallback((uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  }, []);

  return {
    uploads,
    isUploading,
    uploadImages,
    cancelUpload,
    retryUpload,
    clearUploads,
    removeUpload,
  };
}

// Helper function to get image dimensions
function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
