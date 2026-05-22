"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArticleImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

interface Article {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  status: "draft" | "published" | "archived";
  featured_image_url: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  article_images?: ArticleImage[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case "published":
      return {
        label: "Dipublikasi",
        color: "text-green-700",
        bg: "bg-green-50 border-green-200",
      };
    case "draft":
      return {
        label: "Draf",
        color: "text-yellow-700",
        bg: "bg-yellow-50 border-yellow-200",
      };
    case "archived":
      return {
        label: "Diarsipkan",
        color: "text-gray-600",
        bg: "bg-gray-50 border-gray-200",
      };
    default:
      return {
        label: status,
        color: "text-gray-700",
        bg: "bg-gray-50 border-gray-200",
      };
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = formatStatus(status);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.color}`}
    >
      {s.label}
    </span>
  );
}

// ─── Image Gallery ───────────────────────────────────────────────────────────

interface ImageGalleryProps {
  images: ArticleImage[];
  articleId: string;
  onDelete: (imageId: string) => void;
}

function ImageGallery({ images, articleId, onDelete }: ImageGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (imageId: string) => {
    setDeletingId(imageId);
    try {
      const res = await apiFetch(
        `/api/cms/articles/${articleId}/images/${imageId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        onDelete(imageId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Gagal menghapus gambar");
      }
    } catch {
      alert("Gagal menghapus gambar");
    } finally {
      setDeletingId(null);
    }
  };

  if (images.length === 0) {
    return <p className="text-sm text-gray-400 italic">Belum ada gambar.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {images.map((img) => (
        <div
          key={img.id}
          className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
        >
          <Image
            src={img.url}
            alt={img.alt_text || "Article image"}
            fill
            className="object-cover"
            unoptimized
          />
          <button
            onClick={() => void handleDelete(img.id)}
            disabled={deletingId === img.id}
            className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            title="Hapus gambar"
          >
            {deletingId === img.id ? (
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <TrashIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "failed";
  progress: number;
  error?: string;
  publicUrl?: string;
  objectKey?: string;
}

interface ArticleImageUploaderProps {
  articleId: string;
  onUploadComplete: () => void;
}

function ArticleImageUploader({
  articleId,
  onUploadComplete,
}: ArticleImageUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 10;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: UploadFile[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (files.length + newFiles.length >= MAX_FILES) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name}: tipe file tidak didukung`);
        return;
      }
      if (file.size > MAX_SIZE) {
        alert(`${file.name}: ukuran maksimal 5MB`);
        return;
      }
      newFiles.push({
        id: crypto.randomUUID(),
        file,
        status: "pending",
        progress: 0,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const { file, id } = uploadFile;
    const ac = new AbortController();
    abortControllers.current.set(id, ac);

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "uploading", progress: 0 } : f,
      ),
    );

    try {
      const urlRes = await fetch("/api/cms/articles/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
        signal: ac.signal,
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || "Gagal mendapatkan URL upload");
      }

      const { uploadUrl, publicUrl, objectKey } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, progress } : f)),
            );
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload gagal: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });
        xhr.addEventListener("abort", () => reject(new Error("Dibatalkan")));
        xhr.addEventListener("timeout", () => reject(new Error("Timeout")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("x-amz-content-sha256", "UNSIGNED-PAYLOAD");
        xhr.send(file);
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "success", progress: 100, publicUrl, objectKey }
            : f,
        ),
      );
    } catch (err) {
      if (ac.signal.aborted) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "failed", error: "Dibatalkan" } : f,
          ),
        );
      } else {
        const msg = err instanceof Error ? err.message : "Upload gagal";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "failed", error: msg } : f,
          ),
        );
      }
    } finally {
      abortControllers.current.delete(id);
    }
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;
    setIsUploading(true);
    await Promise.all(pending.map((f) => uploadFile(f)));
    setIsUploading(false);
  };

  const retryUpload = (id: string) => {
    const f = files.find((x) => x.id === id);
    if (f) {
      setFiles((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, status: "pending", progress: 0, error: undefined }
            : x,
        ),
      );
      void uploadFile({ ...f, status: "pending", progress: 0 });
    }
  };

  const cancelUpload = (id: string) => {
    abortControllers.current.get(id)?.abort();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDone = async () => {
    const done = files.filter(
      (f) => f.status === "success" && f.objectKey && f.publicUrl,
    );

    if (done.length > 0) {
      setIsUploading(true);
      setGlobalError(null);
      try {
        const res = await apiFetch(
          `/api/cms/articles/${articleId}/images/batch`,
          {
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
          },
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menyimpan gambar ke database");
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal menyimpan gambar ke database";
        setGlobalError(message);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    setFiles([]);
    onUploadComplete();
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isUploading
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFileSelect(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />
        <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isUploading
            ? "Mengunggah..."
            : "Seret & letakkan gambar, atau klik untuk memilih"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Maks 10MB per file, {MAX_FILES} file maksimal
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {globalError && <p className="text-sm text-red-600">{globalError}</p>}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {files.length} file(s)
            </span>
            <div className="flex gap-2">
              {!isUploading && files.some((f) => f.status === "pending") && (
                <button
                  onClick={() => void uploadAll()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Unggah Semua
                </button>
              )}
              {files.every(
                (f) => f.status === "success" || f.status === "failed",
              ) && (
                <button
                  onClick={() => void handleDone()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading && (
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {isUploading ? "Menyimpan..." : "Selesai"}
                </button>
              )}
            </div>
          </div>

          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-md overflow-hidden relative">
                {f.publicUrl ? (
                  <Image
                    src={f.publicUrl}
                    alt={f.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <PhotoIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(f.file.size / 1024).toFixed(1)} KB
                </p>
                {f.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === "failed" && (
                  <p className="mt-1 text-xs text-red-600">{f.error}</p>
                )}
                {f.status === "success" && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" /> Berhasil
                  </p>
                )}
              </div>
              <div className="flex gap-1.5">
                {f.status === "failed" && (
                  <button
                    onClick={() => retryUpload(f.id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                    title="Coba lagi"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                )}
                {f.status === "pending" && (
                  <button
                    onClick={() => cancelUpload(f.id)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                    title="Batalkan"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                  title="Hapus"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Article Card ────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

function ArticleCard({ article, onEdit, onDelete }: ArticleCardProps) {
  const imageCount = article.article_images?.length ?? 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 overflow-hidden">
      {/* Featured Image */}
      {article.featured_image_url && (
        <div className="relative h-44 w-full overflow-hidden bg-gray-50">
          <Image
            src={article.featured_image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <StatusBadge status={article.status} />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-tight">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-1">
          {imageCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <PhotoIcon className="h-3.5 w-3.5" />
              {imageCount} gambar
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            {formatDate(article.created_at)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 mt-1 border-t border-gray-100">
          <button
            onClick={() => onEdit(article)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(article)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <DocumentTextIcon className="h-12 w-12 text-gray-300" />
      <h3 className="mt-3 text-sm font-medium text-gray-900">
        {hasFilter ? "Tidak ada artikel yang cocok" : "Belum ada artikel"}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {hasFilter ? "Coba ubah filter pencarian" : "Buat artikel pertama Anda"}
      </p>
    </div>
  );
}

// ─── Article Form Modal ──────────────────────────────────────────────────────

interface ArticleFormModalProps {
  article?: Article | null;
  onClose: () => void;
  onSaved: (article: Article) => void;
}

function ArticleFormModal({
  article,
  onClose,
  onSaved,
}: ArticleFormModalProps) {
  const isEditing = !!article;
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    article?.status ?? "draft",
  );
  const [featuredImageUrl, setFeaturedImageUrl] = useState(
    article?.featured_image_url ?? "",
  );
  const [images, setImages] = useState<ArticleImage[]>(
    article?.article_images ?? [],
  );
  const [showImageSection, setShowImageSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Judul artikel wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        content: content.trim() || undefined,
        status,
        featured_image_url: featuredImageUrl.trim() || undefined,
      };

      const res = isEditing
        ? await apiFetch(`/api/cms/articles/${article.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/cms/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Gagal menyimpan artikel");
        return;
      }

      const saved = body.article as Article;
      onSaved({ ...saved, article_images: images });
      onClose();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageDeleted = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleUploadComplete = async () => {
    setShowUploader(false);
    setSavingImages(true);
    try {
      const res = await apiFetch(`/api/cms/articles/${article!.id}/images`);
      const body = await res.json();
      if (res.ok) {
        setImages(body.images ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? "Edit Artikel" : "Artikel Baru"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul artikel"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated-from-title"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ringkasan
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Deskripsi singkat artikel"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konten
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Isi artikel..."
              rows={8}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
            />
          </div>

          {/* Featured Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gambar Utama (URL)
            </label>
            <input
              type="url"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {featuredImageUrl && (
              <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={featuredImageUrl}
                  alt="Featured"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="draft">Draf</option>
              <option value="published">Dipublikasi</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </div>

          {/* Images section — only when editing */}
          {isEditing && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <PhotoIcon className="h-4 w-4" />
                  Galeri Gambar
                </h3>
                <button
                  onClick={() => setShowUploader((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <CloudArrowUpIcon className="h-3.5 w-3.5" />
                  {showUploader ? "Tutup" : "Tambah Gambar"}
                </button>
              </div>

              {showUploader && (
                <ArticleImageUploader
                  articleId={article.id}
                  onUploadComplete={handleUploadComplete}
                />
              )}

              {savingImages && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Memuat ulang gambar...
                </div>
              )}

              {!savingImages && (
                <ImageGallery
                  images={images}
                  articleId={article.id}
                  onDelete={handleImageDeleted}
                />
              )}
            </div>
          )}

          {!isEditing && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 Simpan artikel terlebih dahulu, lalu Anda bisa menambahkan
                gambar pada mode edit.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {saving
              ? "Menyimpan..."
              : isEditing
                ? "Simpan Perubahan"
                : "Buat Artikel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

interface DeleteModalProps {
  article: Article;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ article, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cms/articles/${article.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Gagal menghapus artikel");
        return;
      }
      onDeleted(article.id);
      onClose();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-red-100 mb-4">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            Hapus Artikel?
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Anda yakin ingin menghapus{" "}
            <strong>&quot;{article.title}&quot;</strong>? Tindakan ini tidak
            dapat dibatalkan.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {deleting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="flex gap-2 pt-3 mt-1 border-t border-gray-100">
          <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
          <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminArticlesPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const LIMIT = 12;

  // Modals
  const [deleteArticle, setDeleteArticle] = useState<Article | null>(null);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Access guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/articles");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin/articles");
            return;
          }
          router.replace("/landing");
          return;
        }
        const profile = await res.json();
        if (!hasAdminRoleInProfile(profile)) {
          router.replace("/landing");
          return;
        }
      } catch {
        router.replace("/landing");
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser]);

  // ── Load articles ──────────────────────────────────────────────────────────
  const loadArticles = useCallback(
    async (isRefresh = false, pageNum = page) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(LIMIT),
        });
        if (activeStatus) params.set("status", activeStatus);
        if (query.trim()) params.set("search", query.trim());

        const res = await apiFetch(`/api/cms/articles?${params.toString()}`);
        const body = (await res.json().catch(() => ({}))) as {
          articles?: Article[];
          meta?: { total: number; totalPages: number };
          error?: string;
        };

        if (!res.ok) {
          setError(body.error ?? "Gagal memuat artikel");
          return;
        }

        setArticles(body.articles ?? []);
        setTotalCount(body.meta?.total ?? 0);
        setTotalPages(body.meta?.totalPages ?? 1);
        setPage(pageNum);
      } catch {
        setError("Gagal memuat artikel. Periksa koneksi Anda.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, activeStatus, query],
  );

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadArticles();
    }
  }, [checkingAccess, isAuthenticated, loadArticles]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const handleStatusFilter = (s: string) => {
    setActiveStatus(s);
    setPage(1);
  };

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadArticles(false, 1);
    }
  }, [query, activeStatus]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = (article: Article) => {
    router.push(`/admin/articles/compose?id=${article.id}`);
  };

  const handleNew = () => {
    router.push("/admin/articles/compose");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadArticles();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    void loadArticles(false, newPage);
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat artikel..." />;
  }

  const hasActiveFilter = !!query || !!activeStatus;
  const hasArticles = articles.length > 0;
  const statusOptions = [
    { value: "", label: "Semua" },
    { value: "published", label: "Dipublikasi" },
    { value: "draft", label: "Draf" },
    { value: "archived", label: "Diarsipkan" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
        {/* ── Gradient Hero ─────────────────────────────────────────────────── */}
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Header halaman artikel"
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Manajemen Artikel</h1>
              <p className="mt-0.5 text-xs text-white/80">
                {loading ? "Memuat..." : `${totalCount} artikel`}
              </p>
            </div>
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Buat Artikel
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              title="Segarkan daftar"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Search + filter */}
          <div className="relative z-10 mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul, slug, ringkasan..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-lg border-0 bg-white/90 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              {query && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusFilter(opt.value)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activeStatus === opt.value
                      ? "border-white/60 bg-white text-blue-700"
                      : "border-white/30 bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <section className="flex-1 overflow-auto px-3 py-4 sm:px-4">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => void loadArticles()}
                className="ml-auto text-xs text-red-600 underline hover:no-underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Refresh button */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {hasActiveFilter
                ? `${articles.length} hasil`
                : `${totalCount} artikel`}
            </p>
            <button
              onClick={() => void loadArticles(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Grid */}
          {!loading && !error && !hasArticles ? (
            <EmptyState hasFilter={hasActiveFilter} />
          ) : (
            <div className="flex flex-col gap-4">
              {loading
                ? Array.from({ length: LIMIT }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : articles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onEdit={handleEdit}
                      onDelete={(a) => setDeleteArticle(a)}
                    />
                  ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {deleteArticle && (
        <DeleteModal
          article={deleteArticle}
          onClose={() => setDeleteArticle(null)}
          onDeleted={(id) => {
            setArticles((prev) => prev.filter((a) => a.id !== id));
            setTotalCount((c) => Math.max(0, c - 1));
          }}
        />
      )}
    </>
  );
}
