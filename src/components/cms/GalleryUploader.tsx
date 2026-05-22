"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import type { ArticleImage } from "@/types/article-image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface AltTextModalProps {
  image: ArticleImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageId: string, altText: string) => Promise<void>;
}

function AltTextModal({ image, isOpen, onClose, onSave }: AltTextModalProps) {
  const [altText, setAltText] = useState(image?.alt_text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !image) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(image.id, altText);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan alt text");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Alt Text</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {image.object_key.split("/").pop()}
              </p>
              <p className="text-xs text-gray-500">
                {(image.size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Text (Deskripsi Gambar)
            </label>
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Deskripsikan gambar untuk aksesibilitas..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Berguna untuk aksesibilitas dan SEO
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-1" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SortableImageCardProps {
  image: ArticleImage;
  onEditAlt: (image: ArticleImage) => void;
  onDelete: (image: ArticleImage) => void;
  onReplace: (image: ArticleImage, file: File) => Promise<void>;
}

function SortableImageCard({
  image,
  onEditAlt,
  onDelete,
  onReplace,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onReplace(image, file);
    }
    e.target.value = "";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
        title="Seret untuk mengubah urutan"
      >
        <ArrowsUpDownIcon className="h-4 w-4 text-gray-600" />
      </div>

      {/* Image Preview */}
      <div className="aspect-square relative bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.alt_text || ""}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleReplace}
          className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 shadow-sm transition-colors"
          title="Ganti gambar"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => onEditAlt(image)}
          className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 shadow-sm transition-colors"
          title="Edit alt text"
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(image)}
          className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white hover:bg-red-50 shadow-sm transition-colors"
          title="Hapus gambar"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Image Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-gray-900 truncate">
          {image.object_key.split("/").pop() || "Gambar"}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {(image.size_bytes / 1024).toFixed(0)} KB
          </p>
          {image.alt_text && (
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Ada alt text
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface GalleryUploaderProps {
  articleId: string | null;
  existingImages: ArticleImage[];
  onImagesUpdated: (images: ArticleImage[]) => void;
  onArticleIdCreated?: (id: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONCURRENT = 3;

export function GalleryUploader({
  articleId,
  existingImages,
  onImagesUpdated,
  onArticleIdCreated,
}: GalleryUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Modal state
  const [editingImage, setEditingImage] = useState<ArticleImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete undo state
  const [deletedImage, setDeletedImage] = useState<{
    image: ArticleImage;
    index: number;
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    onArticleIdCreated?.(article_id);
    return article_id;
  }, [articleId, onArticleIdCreated]);

  const uploadAndSaveImage = async (
    item: UploadFile,
    targetArticleId: string,
    sortOrder?: number
  ) => {
    const ac = new AbortController();
    abortControllers.current.set(item.id, ac);

    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: "uploading" as const, progress: 0 }
          : f
      )
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
        xhr.setRequestHeader("x-amz-content-sha256", "UNSIGNED-PAYLOAD");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
            );
          }
        };
        xhr.onload = () =>
          xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(item.file);
      });

      // 3. Save to database immediately
      const saveRes = await apiFetch(
        `/api/cms/articles/${targetArticleId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectKey,
            url: publicUrl,
            mimeType: item.file.type,
            altText: "",
            sortOrder,
          }),
        }
      );

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Gagal menyimpan gambar ke database");
      }

      const { image } = await saveRes.json();

      // 4. Update parent component
      onImagesUpdated([...existingImages, image]);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "done" as const, objectKey, publicUrl }
            : f
        )
      );

      toast.success("Gambar berhasil diunggah");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "error" as const, error: msg }
            : f
        )
      );
      toast.error(msg);
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
      toast.error("File tidak valid atau terlalu besar (max 10MB)");
      return;
    }

    setFiles((prev) => [...prev, ...valid]);

    try {
      const targetId = await ensureArticleId();

      const pending = valid.filter((v) => v.status === "pending");
      let running = 0;
      const queue = [...pending];

      const runNext = () => {
        if (queue.length === 0) return;
        const next = queue.shift()!;
        running++;
        uploadAndSaveImage(next, targetId).finally(() => {
          running--;
          runNext();
        });
      };

      for (let i = 0; i < Math.min(MAX_CONCURRENT, pending.length); i++) {
        runNext();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setGlobalError(message);
      toast.error(message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
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
            : f
        )
      );
      const targetId = await ensureArticleId();
      uploadAndSaveImage({ ...file, status: "pending" as const }, targetId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setGlobalError(message);
      toast.error(message);
    }
  };

  const handleEditAlt = (image: ArticleImage) => {
    setEditingImage(image);
    setIsModalOpen(true);
  };

  const handleSaveAltText = async (imageId: string, altText: string) => {
    if (!articleId) throw new Error("Article ID not available");

    const res = await apiFetch(
      `/api/cms/articles/${articleId}/images/${imageId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt_text: altText }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menyimpan alt text");
    }

    const { image } = await res.json();

    // Update existing images
    onImagesUpdated(
      existingImages.map((img) => (img.id === imageId ? image : img))
    );

    toast.success("Alt text berhasil disimpan");
  };

  const handleDeleteImage = async (image: ArticleImage) => {
    if (!articleId) return;

    const imageIndex = existingImages.findIndex((img) => img.id === image.id);
    if (imageIndex === -1) return;

    // Optimistically remove from UI
    setDeletedImage({ image, index: imageIndex });
    onImagesUpdated(existingImages.filter((img) => img.id !== image.id));

    // Show undo toast
    const undoToast = toast.success(
      "Gambar dihapus",
      {
        action: {
          label: "Urungkan",
          onClick: () => {
            // Restore image
            const restored = [...existingImages];
            restored.splice(imageIndex, 0, image);
            onImagesUpdated(restored);
            setDeletedImage(null);
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
            }
          },
        },
        duration: 5000,
      }
    );

    // Actually delete from server
    try {
      const res = await apiFetch(
        `/api/cms/articles/${articleId}/images/${image.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error("Gagal menghapus gambar dari server");
      }

      // Clear undo state after timeout
      undoTimeoutRef.current = setTimeout(() => {
        setDeletedImage(null);
      }, 5000);
    } catch (err) {
      // If delete fails, restore the image
      const restored = [...existingImages];
      restored.splice(imageIndex, 0, image);
      onImagesUpdated(restored);
      setDeletedImage(null);

      toast.error("Gagal menghapus gambar");
      toast.dismiss(undoToast);
    }
  };

  const handleReplaceImage = async (
    existingImage: ArticleImage,
    newFile: File
  ) => {
    if (!articleId) return;

    try {
      // 1. Get signed URL for replacement
      const urlRes = await apiFetch(
        `/api/cms/articles/${articleId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageId: existingImage.id,
            newFilename: newFile.name,
            newContentType: newFile.type,
          }),
        }
      );

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || "Gagal mendapatkan URL");
      }

      const { uploadUrl, publicUrl, oldObjectKey } = await urlRes.json();

      // 2. Upload to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", newFile.type);
        xhr.setRequestHeader("x-amz-content-sha256", "UNSIGNED-PAYLOAD");
        xhr.onload = () =>
          xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(newFile);
      });

      // 3. Update UI with new URL
      const updatedImages = existingImages.map((img) =>
        img.id === existingImage.id
          ? { ...img, url: publicUrl, mime_type: newFile.type }
          : img
      );
      onImagesUpdated(updatedImages);

      toast.success("Gambar berhasil diganti");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengganti gambar";
      toast.error(msg);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = existingImages.findIndex(
      (img) => img.id === active.id
    );
    const newIndex = existingImages.findIndex((img) => img.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically reorder
    const reordered = arrayMove(existingImages, oldIndex, newIndex);
    onImagesUpdated(reordered);

    // Update sort_order on server
    try {
      await apiFetch(`/api/cms/articles/${articleId}/images/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageIds: reordered.map((img) => img.id),
        }),
      });

      toast.success("Urutan gambar diubah");
    } catch (err) {
      // Revert on error
      onImagesUpdated(existingImages);
      toast.error("Gagal mengubah urutan gambar");
    }
  };

  const uploadingCount = files.filter((f) => f.status === "uploading").length;

  const allImages = useMemo(() => {
    return [...existingImages, ...files.filter((f) => f.status === "done")];
  }, [existingImages, files]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Galeri Foto
        </label>
        {existingImages.length > 0 && (
          <span className="text-xs text-gray-500">
            {existingImages.length} gambar
          </span>
        )}
      </div>

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
          flex items-center justify-center border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all
          ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }
        `}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <span className="text-sm text-gray-500">
            Klik atau drag untuk tambah gambar
          </span>
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, WebP, GIF (max 10MB)
          </p>
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
      {globalError && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {globalError}
        </p>
      )}

      {/* Uploading files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Mengunggah
          </h4>
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
            >
              {item.status === "uploading" && (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 relative overflow-hidden">
                  <span className="text-xs text-gray-500 z-10">
                    {item.progress}%
                  </span>
                  <div
                    className="absolute inset-0 bg-blue-100 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "done" && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.preview}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              {item.status === "error" && (
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-red-400">
                  <XMarkIcon className="h-5 w-5" />
                </div>
              )}
              {item.status === "pending" && (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                  <PhotoIcon className="h-5 w-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 truncate block">
                  {item.file.name}
                </span>
                {item.status === "error" && (
                  <span className="text-xs text-red-500">{item.error}</span>
                )}
                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {item.status === "error" && (
                <button
                  onClick={() => retryFile(item.id)}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Coba lagi"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              )}
              {(item.status === "pending" || item.status === "uploading") && (
                <button
                  onClick={() => removeFile(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Batal"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Images Grid */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Gambar Tersimpan
          </h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={existingImages.map((img) => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((image) => (
                  <SortableImageCard
                    key={image.id}
                    image={image}
                    onEditAlt={handleEditAlt}
                    onDelete={handleDeleteImage}
                    onReplace={handleReplaceImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Alt Text Modal */}
      <AltTextModal
        image={editingImage}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingImage(null);
        }}
        onSave={handleSaveAltText}
      />
    </div>
  );
}
