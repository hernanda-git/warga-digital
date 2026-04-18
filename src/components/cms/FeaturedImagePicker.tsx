"use client";

import { useRef, useState } from "react";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";

interface FeaturedImagePickerProps {
  articleId: string | null;
  currentUrl: string | null;
  onUpdated: (url: string) => void;
  onRemoved: () => void;
}

export function FeaturedImagePicker({
  articleId,
  currentUrl,
  onUpdated,
  onRemoved,
}: FeaturedImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      // Ensure we have an articleId (create draft if needed)
      let targetArticleId = articleId;
      if (!targetArticleId) {
        const draftRes = await apiFetch("/api/cms/articles/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!draftRes.ok) {
          const err = await draftRes.json();
          throw new Error(err.error || "Gagal membuat draft");
        }
        const { article_id } = await draftRes.json();
        targetArticleId = article_id;
      }

      // Get signed upload URL
      const urlRes = await apiFetch("/api/cms/articles/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: targetArticleId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || "Gagal mendapatkan URL upload");
      }
      const { uploadUrl, publicUrl } = await urlRes.json();

      // Upload directly to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () =>
          xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(file);
      });

      // Update article with featured_image_url
      const patchRes = await apiFetch(`/api/cms/articles/${targetArticleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured_image_url: publicUrl }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || "Gagal menyimpan URL gambar");
      }
      onUpdated(publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      console.error("Error uploading featured image:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!articleId) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/cms/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured_image_url: "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus gambar");
      }
      onRemoved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      console.error("Error removing featured image:", err);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Gambar Sampul</label>

      {currentUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="Featured"
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              title="Ganti"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              title="Hapus"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith("image/")) upload(file);
          }}
          className={`
            flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {uploading ? (
            <span className="text-sm text-gray-400">Mengupload...</span>
          ) : (
            <>
              <CloudArrowUpIcon className="h-8 w-8 text-gray-300 mb-2" />
              <span className="text-sm text-gray-400">
                Klik atau drag untuk upload
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </div>
  );
}
