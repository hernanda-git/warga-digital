"use client";

import { useRef, useState, useCallback } from "react";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import type { ArticleImage } from "@/types/article-image";

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  objectKey?: string;
  publicUrl?: string;
}

interface GalleryUploaderProps {
  articleId: string | null;
  existingImages: ArticleImage[];
  onImagesUpdated: (images: ArticleImage[]) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONCURRENT = 3;

export function GalleryUploader({
  articleId,
  existingImages,
  onImagesUpdated,
}: GalleryUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Ensure we have an articleId before uploading
  const ensureArticleId = useCallback(async (): Promise<string> => {
    if (articleId) return articleId;
    const res = await apiFetch("/api/cms/articles/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal membuat draft");
    }
    const { article_id } = await res.json();
    return article_id;
  }, [articleId]);

  const uploadFile = async (item: UploadFile, targetArticleId: string) => {
    const ac = new AbortController();
    abortControllers.current.set(item.id, ac);

    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: "uploading" as const, progress: 0 }
          : f,
      ),
    );

    try {
      // 1. Get signed URL
      const urlRes = await apiFetch("/api/cms/articles/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: targetArticleId,
          filename: item.file.name,
          contentType: item.file.type,
          fileSize: item.file.size,
        }),
        signal: ac.signal,
      });
      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || "Gagal mendapatkan URL");
      }
      const { uploadUrl, publicUrl, objectKey } = await urlRes.json();

      // 2. Upload to R2 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", item.file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)),
            );
          }
        };
        xhr.onload = () =>
          xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(item.file);
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "done" as const, objectKey, publicUrl }
            : f,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "error" as const, error: msg }
            : f,
        ),
      );
    } finally {
      abortControllers.current.delete(item.id);
    }
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    setGlobalError(null);
    const valid = Array.from(newFiles)
      .filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      }));

    if (valid.length === 0) {
      setGlobalError("Tidak ada file gambar valid yang dipilih");
      return;
    }

    setFiles((prev) => [...prev, ...valid]);

    try {
      // Ensure article exists (creates draft if new)
      const targetId = await ensureArticleId();

      // Upload with concurrency limit
      const pending = valid.filter((v) => v.status === "pending");
      let running = 0;
      const queue = [...pending];

      const runNext = () => {
        if (queue.length === 0) return;
        const next = queue.shift()!;
        running++;
        uploadFile(next, targetId).finally(() => {
          running--;
          runNext();
        });
      };

      // Start MAX_CONCURRENT workers
      for (let i = 0; i < Math.min(MAX_CONCURRENT, pending.length); i++) {
        runNext();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setGlobalError(message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // After all files are done, batch-save to DB
  const handleSaveAll = async () => {
    const done = files.filter(
      (f) => f.status === "done" && f.objectKey && f.publicUrl,
    );
    if (done.length === 0) return;

    setUploading(true);
    setGlobalError(null);
    try {
      const targetId = articleId ?? (await ensureArticleId());
      const res = await apiFetch(`/api/cms/articles/${targetId}/images/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: done.map((f, i) => ({
            object_key: f.objectKey,
            url: f.publicUrl,
            mime_type: f.file.type,
            sort_order: i,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan gambar");
      }
      const { images } = await res.json();
      onImagesUpdated(images);
      setFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setGlobalError(message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id: string) => {
    const ac = abortControllers.current.get(id);
    if (ac) {
      ac.abort();
      abortControllers.current.delete(id);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const retryFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    try {
      setGlobalError(null);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "pending" as const, error: undefined }
            : f,
        ),
      );
      const targetId = await ensureArticleId();
      uploadFile({ ...file, status: "pending" as const }, targetId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setGlobalError(message);
    }
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const avgProgress =
    uploadingCount > 0
      ? Math.round(
          files
            .filter((f) => f.status === "uploading")
            .reduce((sum, f) => sum + f.progress, 0) / uploadingCount,
        )
      : 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Galeri Gambar</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex items-center justify-center border-2 border-dashed rounded-lg h-24 cursor-pointer transition-colors
          ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }
        `}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <span className="text-xs text-gray-400">
            Klik atau drag untuk tambah gambar
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Error message */}
      {globalError && <p className="text-sm text-red-600">{globalError}</p>}

      {/* File list */}
      {files.map((item) => (
        <div key={item.id} className="flex items-center gap-3 text-sm">
          {item.status === "uploading" && (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-400">{item.progress}%</span>
            </div>
          )}
          {item.status === "done" && (
            <img
              src={item.preview}
              alt=""
              className="w-10 h-10 rounded object-cover shrink-0"
            />
          )}
          {item.status === "error" && (
            <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center shrink-0 text-red-400">
              <XMarkIcon className="h-4 w-4" />
            </div>
          )}
          {item.status === "pending" && (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
              <CloudArrowUpIcon className="h-4 w-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <span className="text-gray-700 truncate block">
              {item.file.name}
            </span>
            {item.status === "error" && (
              <span className="text-xs text-red-500">{item.error}</span>
            )}
          </div>

          {item.status === "error" && (
            <button
              onClick={() => retryFile(item.id)}
              className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
              title="Coba lagi"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => removeFile(item.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Hapus"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Progress bar */}
      {files.some((f) => f.status === "uploading") && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Mengunggah {uploadingCount} file...
            </span>
            <span className="text-xs text-gray-500">{avgProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${avgProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Save button */}
      {allDone && (
        <button
          onClick={handleSaveAll}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {uploading ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="h-4 w-4" />
              Simpan {doneCount} Gambar
            </>
          )}
        </button>
      )}
    </div>
  );
}
