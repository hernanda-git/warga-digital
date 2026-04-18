# Phase 3 & 4: Featured Image + Gallery Uploaders

**Phase:** 3 & 4 (combined implementation)  
**Parent Plan:** [PLAN.md](../PLAN.md)  
**Previous Phase:** [02_COMPOSER_PAGE.md](./02_COMPOSER_PAGE.md)

---

## Overview

These phases implement the two image handling components for the `ArticleComposer`:

1. **Phase 3 — FeaturedImagePicker**: Single hero image with media picker UX
2. **Phase 4 — GalleryUploader**: Multi-image drag-and-drop uploader with inline alt text editing

Both components share the same underlying R2 upload flow but serve different purposes. The key architectural decision is that **both must work before an article has an ID** by using the draft placeholder pattern established in Phase 1.

---

## 3.1 FeaturedImagePicker Component

### Purpose

Replace the current bare text input for `featured_image_url` with a visual picker that:
- Shows a thumbnail when an image is set
- Allows click-to-upload (replaces the image)
- Has a Remove button to clear the image
- Persists changes via `PATCH /api/cms/articles/{articleId}` immediately

### Location

```
src/components/cms/FeaturedImagePicker.tsx
```

### Props

```typescript
interface FeaturedImagePickerProps {
  articleId: string | null;        // null = new article, will trigger draft creation
  currentUrl: string | null;       // currently set featured image URL
  onUpdated: (url: string) => void; // called after PATCH succeeds
  onRemoved: () => void;           // called after PATCH with empty string
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Gambar Sampul                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │                                               │    │
│  │  [thumbnail if set]                          │    │
│  │  OR                                          │    │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │    │
│  │    Klik untuk upload gambar sampul       │    │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │    │
│  │                                               │    │
│  └─────────────────────────────────────────────┘    │
│  [Ganti Gambar]          [Hapus] ← only if set    │
└─────────────────────────────────────────────────────┘
```

### Upload Flow

```
Click "Ganti Gambar" or dashed area
         │
         ▼
File input opens (accept: image/jpeg,image/png,image/webp)
         │
         ▼
File selected
         │
         ▼ POST /api/cms/articles/upload-url
  Body: { articleId, filename, contentType, fileSize }
         │
         ▼ (if articleId === null)
  POST /api/cms/articles/draft → get articleId first
         │
         ▼ PUT {uploadUrl} → R2 stores file
         │
         ▼ PATCH /api/cms/articles/{articleId}
  Body: { featured_image_url: publicUrl }
         │
         ▼ onUpdated(publicUrl)
```

### Implementation Details

```typescript
// src/components/cms/FeaturedImagePicker.tsx
"use client";

import { useRef, useState } from "react";
import { CloudArrowUpIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
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

  const upload = async (file: File) => {
    setUploading(true);
    try {
      // Ensure we have an articleId (create draft if needed)
      let targetArticleId = articleId;
      if (!targetArticleId) {
        const draftRes = await apiFetch("/api/cms/articles/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!draftRes.ok) throw new Error("Gagal membuat draft");
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
      if (!urlRes.ok) throw new Error("Gagal mendapatkan URL upload");
      const { uploadUrl, publicUrl } = await urlRes.json();

      // Upload directly to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText)));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(file);
      });

      // Update article with featured_image_url
      const patchRes = await apiFetch(`/api/cms/articles/${targetArticleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured_image_url: publicUrl }),
      });
      if (!patchRes.ok) throw new Error("Gagal menyimpan URL gambar");
      onUpdated(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!articleId) return;
    const res = await apiFetch(`/api/cms/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured_image_url: "" }),
    });
    if (res.ok) onRemoved();
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
              className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow-sm"
              title="Ganti"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemove}
              className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow-sm"
              title="Hapus"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith("image/")) upload(file);
          }}
          className={`
            flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {uploading ? (
            <span className="text-sm text-gray-400">Mengupload...</span>
          ) : (
            <>
              <CloudArrowUpIcon className="h-8 w-8 text-gray-300 mb-2" />
              <span className="text-sm text-gray-400">Klik atau drag untuk upload</span>
            </>
          )}
        </div>
      )}

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
```

---

## 4.1 GalleryUploader Component

### Purpose

Replaces `ArticleImageUploader` (from the current `ArticleFormModal`) with a polished drag-and-drop uploader that:
- Works during new article creation (creates draft placeholder on first upload)
- Shows per-file progress bars
- Supports drag-and-drop
- Saves all images via `POST /api/cms/articles/{id}/images/batch` after all uploads complete
- Allows inline alt text editing per image
- Handles cancel/retry per file

### Location

```
src/components/cms/GalleryUploader.tsx
```

### Props

```typescript
interface GalleryUploaderProps {
  articleId: string | null;
  existingImages: ArticleImage[];
  onImagesUpdated: (images: ArticleImage[]) => void;
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Galeri Gambar                                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  ┌────┐ ┌────┐ ┌────┐                       │  │
│  │  │ 📷 │ │ 📷 │ │ 📷 │   ← drag-drop zone    │  │
│  │  │ [x]│ │[x] │ │[x] │     or click to add   │  │
│  │  └────┘ └────┘ └────┘                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Upload: 2/5  ████████░░  80%]                    │
│                                                     │
│  ┌─ Image 1 ────────────────────────────────────┐  │
│  │ [thumb] Caption/Alt: [___________________]  ✓  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Upload Flow

```
User drops/selects files
         │
         ▼
For each file (max 3 concurrent):
  │
  ├─ POST /api/cms/articles/upload-url
  │     ← Returns uploadUrl, publicUrl, objectKey
  │
  ├─ PUT {uploadUrl} → R2 (XHR with progress)
  │
  └─ Store { objectKey, publicUrl, mimeType } in pending list

All uploads complete
         │
         ▼
POST /api/cms/articles/{articleId}/images/batch
  Body: { images: [{ objectKey, url, mimeType, alt_text, sort_order }] }
         │
         ▼
onImagesUpdated(response.images)
```

### Image Editable Fields

Each gallery image has:
- `alt_text` — editable inline text field (caption)
- `sort_order` — determined by sequential upload order (drag-drop deferred to Phase 5)
- `url` — display-only (the R2 public URL)
- `id` — database PK (only set after batch insert)

### Alt Text Inline Editing

After batch insert, images return with real IDs. Each image row in the gallery becomes editable:

```typescript
// Inline edit state per image
const [editingAltText, setEditingAltText] = useState<string>("");
// On blur / enter → PATCH /api/cms/articles/{articleId}/images/{imageId}
```

### Implementation Details

```typescript
// src/components/cms/GalleryUploader.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { CloudArrowUpIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
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
    if (!res.ok) throw new Error("Gagal membuat draft");
    const { article_id } = await res.json();
    return article_id;
  }, [articleId]);

  const uploadFile = async (item: UploadFile, targetArticleId: string) => {
    const ac = new AbortController();
    abortControllers.current.set(item.id, ac);

    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" as const, progress: 0 } : f))
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
      if (!urlRes.ok) throw new Error((await urlRes.json()).error || "Gagal mendapatkan URL");
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
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
            );
          }
        };
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(xhr.statusText)));
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(item.file);
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "done" as const, objectKey, publicUrl } : f
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, error: msg } : f))
      );
    } finally {
      abortControllers.current.delete(item.id);
    }
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles)
      .filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      }));

    if (valid.length === 0) return;

    setFiles((prev) => [...prev, ...valid]);

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // After all files are done, batch-save to DB
  const handleSaveAll = async () => {
    const done = files.filter((f) => f.status === "done" && f.objectKey && f.publicUrl);
    if (done.length === 0) return;

    setUploading(true);
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
      if (!res.ok) throw new Error("Gagal menyimpan gambar");
      const { images } = await res.json();
      onImagesUpdated(images);
      setFiles([]);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id: string) => {
    const ac = abortControllers.current.get(id);
    if (ac) { ac.abort(); abortControllers.current.delete(id); }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const retryFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file || !articleId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "pending" as const, error: undefined } : f))
    );
    const targetId = await ensureArticleId();
    uploadFile({ ...file, status: "pending" as const }, targetId);
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const hasNewFiles = files.length > 0;
  const allDone = files.length > 0 && files.every((f) => f.status === "done");

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex items-center justify-center border-2 border-dashed rounded-lg h-24 cursor-pointer transition-colors
          ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
        `}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <span className="text-xs text-gray-400">Klik atau drag untuk tambah gambar</span>
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

      {/* File list */}
      {files.map((item) => (
        <div key={item.id} className="flex items-center gap-3 text-sm">
          {item.status === "uploading" && (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-400">{item.progress}%</span>
            </div>
          )}
          {item.status === "done" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
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
            <span className="text-gray-700 truncate block">{item.file.name}</span>
            {item.status === "error" && (
              <span className="text-xs text-red-500">{item.error}</span>
            )}
          </div>

          {item.status === "error" && (
            <button onClick={() => retryFile(item.id)} className="p-1 text-blue-600 hover:text-blue-700">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => removeFile(item.id)} className="p-1 text-gray-400 hover:text-red-500">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Progress bar */}
      {files.some((f) => f.status === "uploading") && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{
              width: `${files.filter((f) => f.status === "uploading").reduce((sum, f) => sum + f.progress, 0) / files.filter((f) => f.status === "uploading").length}%`,
            }}
          />
        </div>
      )}

      {/* Save button */}
      {allDone && (
        <button
          onClick={handleSaveAll}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
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
```

---

## 4.2 Image Editable Grid (Post-Batch Save)

After the batch insert completes and `onImagesUpdated` fires, the composer shows a grid of saved images. Each image is editable inline:

```typescript
interface EditableImageRowProps {
  image: ArticleImage;
  articleId: string;
  onUpdated: (updated: ArticleImage) => void;
  onDeleted: (id: string) => void;
}

// PATCH /api/cms/articles/{articleId}/images/{imageId}
// Body: { alt_text: string }
```

### Alt Text Update Flow

```
User edits alt text field → debounce 800ms
         │
         ▼
PATCH /api/cms/articles/{articleId}/images/{imageId}
  Body: { alt_text: "user input" }
         │
         ▼
onUpdated() → update local images state
         │
         ▼
Show brief "Saved" indicator
```

---

## 4.3 Image Delete

```typescript
DELETE /api/cms/articles/{articleId}/images/{imageId}
         │
         ▼
On success → onDeleted(imageId) → remove from local state
         │
         ▼
R2 object also deleted server-side via deleteObject()
```

---

## 4.4 Composer Integration

In `ArticleComposer`, wire up both components:

```typescript
// In ArticleComposer state:
// const [featuredImageUrl, setFeaturedImageUrl] = useState("");
// const [galleryImages, setGalleryImages] = useState<ArticleImage[]>([]);

// FeaturedImagePicker
<FeaturedImagePicker
  articleId={articleId}
  currentUrl={featuredImageUrl}
  onUpdated={(url) => setFeaturedImageUrl(url)}
  onRemoved={() => setFeaturedImageUrl("")}
/>

// GalleryUploader
<GalleryUploader
  articleId={articleId}
  existingImages={galleryImages}
  onImagesUpdated={(imgs) => setGalleryImages(imgs)}
/>
```

When `articleId` becomes available (draft created), it propagates down as a prop. Child components don't need to care whether the article is new or existing — they receive the ID and use it directly.

---

## 4.5 Image URL Display After Upload

After gallery batch insert, each `ArticleImage.url` is the `R2_PUBLIC_BASE_URL` value (`https://oo.warga-digital.com`) + `objectKey`. This URL is used in:
- `next/image` src in the composer preview
- `src` attributes in the ArticleCard featured image display
- Public article pages

The `next.config.ts` remote pattern for `oo.warga-digital.com` handles optimization.

---

## 4.6 Edge Cases

| Scenario | Handling |
|----------|----------|
| User uploads 10 images, some fail | Failed images show error + retry button; successful ones still batch-saved |
| User closes browser mid-upload | AbortController cancels in-flight requests; R2 has no partial objects |
| Draft article never published | Parent composer cleanup handles DELETE on navigation away |
| Duplicate filenames | `generateObjectKey` uses UUID prefix — no collision possible |
| Very large file (>10MB) | Rejected in `handleFiles` before any upload starts |
| Wrong MIME type | Same as above — only ALLOWED_TYPES pass |

---

## 4.7 Testing Checklist

- [ ] Upload single gallery image to new article (no articleId yet) → draft created, image saved correctly
- [ ] Upload 5 gallery images to new article → all 5 saved with correct sort_order
- [ ] Upload to existing article → images appended, existing images unaffected
- [ ] Edit alt text inline → PATCH called, state updated
- [ ] Delete gallery image → DELETE called, image removed from grid, R2 object deleted
- [ ] Featured image: set on new article → draft created, featured_image_url set
- [ ] Featured image: change → PATCH called, old image NOT deleted (intentional — gallery cleanup handles that)
- [ ] Featured image: remove → PATCH called with empty string
- [ ] Retry button on failed upload → re-triggers upload flow
- [ ] Cancel button during upload → XHR aborted, file removed from list

---

## Dependencies

| File | Status |
|------|--------|
| `src/lib/r2.ts` | ✅ Already has `generateSignedUploadUrl`, `deleteObject` |
| `src/app/api/cms/articles/draft/route.ts` | ✅ Phase 1 |
| `src/app/api/cms/articles/upload-url/route.ts` | ✅ Existing |
| `src/app/api/cms/articles/[articleId]/images/batch/route.ts` | ✅ Phase 1 |
| `src/app/api/cms/articles/[articleId]/images/[imageId]/route.ts` | ✅ Existing |
| `next.config.ts` remote pattern for `oo.warga-digital.com` | ✅ Already configured |

---

**Next Phase:** [04_AUTOSAVE_AUTOSLUG.md](./04_AUTOSAVE_AUTOSLUG.md) — implement autosave timer, dirty check, and auto-slug generation.