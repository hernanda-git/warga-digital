"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import type { AssetCategory, AssetItem } from "@/types/asset-rt";

interface ValidationErrors {
  name?: string;
}

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<AssetItem | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitLabel, setUnitLabel] = useState("Pcs");
  const [isUsed, setIsUsed] = useState<string>("unset");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [tagsCsv, setTagsCsv] = useState("");
  const [notes, setNotes] = useState("");

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const fetchData = useCallback(async () => {
    try {
      const [assetRes, catRes] = await Promise.all([
        apiFetch(`/api/asset-rt/${assetId}`),
        apiFetch("/api/asset-rt/categories"),
      ]);

      const assetData = await assetRes.json();
      if (assetData.success) {
        const a = assetData.data as AssetItem;
        setAsset(a);
        setName(a.name);
        setDescription(a.description ?? "");
        setLocation(a.location ?? "");
        setCategoryId(a.category_id ?? "");
        setQuantity(String(a.quantity));
        setUnitLabel(a.unit_label);
        setIsUsed(
          a.is_used === true ? "true" : a.is_used === false ? "false" : "unset",
        );
        setPurchaseDate(a.purchase_date ?? "");
        setTagsCsv(a.tags?.join(", ") ?? "");
        setNotes(a.notes ?? "");
        if (a.image_url) {
          setExistingImageUrl(a.image_url);
          setImagePreview(a.image_url);
        }
      }

      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data);
      }
    } catch {
      setSubmitError("Gagal memuat data aset");
    } finally {
      setPageLoading(false);
      setCategoriesLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    if (!name.trim()) errs.name = "Nama aset harus diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setExistingImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl || null;
    setImageUploading(true);
    try {
      // Server-side upload (no browser→R2 CORS/presigned issues)
      const body = new FormData();
      body.append("file", imageFile);

      const res = await apiFetch("/api/asset-rt/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? "Gagal mengunggah gambar");
      }

      return data.data.url;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal mengunggah gambar",
      );
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const finalImageUrl = await uploadImage();
    if (imageFile && !finalImageUrl) {
      setIsSubmitting(false);
      return;
    }

    try {
      const body: Record<string, string | null> = {
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        category_id: categoryId || null,
        quantity,
        unit_label: unitLabel,
        is_used: isUsed,
        purchase_date: purchaseDate || null,
        tags: tagsCsv,
        notes: notes.trim() || null,
        image_url: finalImageUrl || null,
      };

      const res = await apiFetch(`/api/asset-rt/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.error?.message ?? "Gagal memperbarui aset");
        return;
      }
      router.push(`/asset-rt/${assetId}`);
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal memperbarui aset",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const usageOptions = [
    { value: "unset", label: "Tidak Terpakai" },
    { value: "true", label: "Digunakan" },
    { value: "false", label: "Tidak Digunakan" },
  ];

  if (pageLoading) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        <div className="flex flex-1 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-[3px] border-transparent"
            style={{
              borderTopColor: "var(--color-primary)",
              borderRightColor: "var(--color-primary-muted)",
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative z-10">
            <Link
              href={`/asset-rt/${assetId}`}
              className="mb-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/70 no-underline"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              Detail Aset
            </Link>
            <h1 className="text-lg font-extrabold leading-tight text-white">
              Edit Aset
            </h1>
            <p className="mt-1 text-[13px] text-white/60">
              Perbarui informasi aset
            </p>
          </div>
        </section>

        <div className="lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
          <section className="space-y-5 px-4 pb-10 pt-4 lg:px-0">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Nama Aset <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lampu, Sensor, Alat Semprot, Roundup"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors placeholder:text-app-body-muted/50"
                style={{
                  borderColor: errors.name
                    ? "#EF4444"
                    : "var(--color-input-border)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.name
                    ? "#EF4444"
                    : "var(--color-input-border)";
                }}
              />
              {errors.name && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Deskripsi
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang aset…"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors resize-none placeholder:text-app-body-muted/50"
                style={{
                  borderColor: "var(--color-input-border)",
                  height: 80,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Lokasi
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Balai Warga, Rumah Pak RT, Rumah Pak Wakil, Blok J-K"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors placeholder:text-app-body-muted/50"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Foto Aset
              </label>
              <div
                className="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 transition-colors"
                style={{
                  borderColor: imagePreview
                    ? "var(--color-primary)"
                    : "var(--color-input-border)",
                  background: imagePreview
                    ? "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))"
                    : "var(--color-surface)",
                }}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
                      }}
                    >
                      <PhotoIcon
                        className="h-5 w-5"
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-app-title">
                        Unggah Foto
                      </p>
                      <p className="text-xs text-app-body-muted">
                        JPEG, PNG, WebP, GIF. Maks 10MB
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                  disabled={categoriesLoading}
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Status Penggunaan
                </label>
                <select
                  value={isUsed}
                  onChange={(e) => setIsUsed(e.target.value)}
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                >
                  {usageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Jumlah
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Satuan
                </label>
                <input
                  type="text"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="Pcs"
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors placeholder:text-app-body-muted/50"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Tanggal Pembelian
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Tag (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="Lampu, Alat, Material, Bahan, Stok"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors placeholder:text-app-body-muted/50"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Catatan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan tentang asset yang tidak terkait dengan deskripsi"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-colors resize-none placeholder:text-app-body-muted/50"
                style={{
                  borderColor: "var(--color-input-border)",
                  height: 80,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>

            {submitError && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-[13px] text-[#991B1B]">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
                style={{ background: "var(--color-surface-alt)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || imageUploading}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Menyimpan…
                  </span>
                ) : imageUploading ? (
                  "Mengunggah gambar…"
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    Simpan Perubahan
                  </span>
                )}
              </button>
            </div>
          </section>

          <div className="h-8" />
        </div>
      </div>
    </main>
  );
}
