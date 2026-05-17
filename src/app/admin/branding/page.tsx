"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Branding Page ───────────────────────────────────────────────────────────

export default function BrandingPage() {
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const setLogoUrl = useAuthStore((s) => s.setLogoUrl);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Settings state
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm clear dialog
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // ── Auth & Admin Check ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login");
            return;
          }
          throw new Error("Failed to fetch profile");
        }
        const data: ProfileData = await res.json();
        const admin = hasAdminRoleInProfile(data);
        if (!admin) {
          router.replace("/landing");
          return;
        }
        if (!cancelled) setIsAdmin(true);
      } catch {
        if (!cancelled) {
          toast.error("Gagal memverifikasi akses admin");
          router.replace("/landing");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router, clearUser]);

  // ── Load Settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const res = await apiFetch("/api/admin/settings");
        const data = await res.json();
        if (!cancelled) {
          setSidebarLogoUrl(data.logo_url ?? null);
        }
      } catch {
        if (!cancelled) toast.error("Gagal memuat pengaturan");
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    }

    if (isAdmin) {
      loadSettings();
    } else if (isAdmin === false) {
      setSettingsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // ── File Selection ────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.",
      );
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ukuran file maksimal 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      handleFileSelect(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0] ?? null;
      handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Request signed upload URL
      const urlRes = await apiFetch("/api/admin/settings/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || "Gagal mendapatkan URL upload");
      }

      const { uploadUrl, publicUrl } = await urlRes.json();

      // Step 2: Upload to R2 via signed URL with XHR progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload gagal: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Dibatalkan")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      // Step 3: Save the URL to settings
      const saveRes = await apiFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "logo_url",
          value: publicUrl,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Gagal menyimpan pengaturan");
      }

      setSidebarLogoUrl(publicUrl);
      setLogoUrl(publicUrl); // sync to auth store so sidebar updates reactively
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success("Logo sidebar berhasil diperbarui!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload gagal";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile]);

  // ── Clear Logo ────────────────────────────────────────────────────────────
  const handleClearLogo = useCallback(async () => {
    try {
      const saveRes = await apiFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "logo_url",
          value: "",
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Gagal menghapus logo");
      }

      setSidebarLogoUrl(null);
      setLogoUrl(null); // sync to auth store so sidebar updates reactively
      setShowConfirmClear(false);
      toast.success("Logo sidebar telah dihapus (fallback ke logo default).");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Gagal menghapus logo";
      toast.error(msg);
    }
  }, []);

  // ── Cancel selection ──────────────────────────────────────────────────────
  const handleCancelSelection = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (checking || settingsLoading) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-body-muted)]">Memuat...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-input-border)] bg-app-surface px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-[var(--color-primary-muted)] active:scale-90"
          aria-label="Kembali ke admin"
        >
          <ArrowLeftIcon className="h-4 w-4 text-[var(--color-body)]" />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-[var(--color-title)]">
            Branding
          </h1>
          <p className="text-[12px] text-[var(--color-body-muted)]">
            Atur tampilan logo &amp; identitas aplikasi
          </p>
        </div>
      </header>

      {/* ── Scrollable Body ───────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
          {/* ── Current Logo Preview ──────────────────────────────────────── */}
          <section aria-label="Logo saat ini">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-title)]">
              Logo Sidebar Saat Ini
            </h2>

            <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-input-border)] bg-app-surface p-4">
              {/* Logo Preview */}
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
                {sidebarLogoUrl ? (
                  <Image
                    src={sidebarLogoUrl}
                    alt="Logo sidebar"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-[10px] font-bold text-[var(--color-body-muted)]">
                      DEFAULT
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-title)]">
                  {sidebarLogoUrl ? "Logo Kustom" : "Logo Default"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--color-body-muted)]">
                  {sidebarLogoUrl ||
                    "Menggunakan logo bawaan (warga-digital.png)"}
                </p>
              </div>

              {sidebarLogoUrl && (
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 active:scale-95"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Hapus
                </button>
              )}
            </div>
          </section>

          {/* ── Upload New Logo ───────────────────────────────────────────── */}
          <section aria-label="Upload logo baru">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-title)]">
              {sidebarLogoUrl ? "Ganti Logo" : "Upload Logo"}
            </h2>

            {/* Drop zone / file picker */}
            {!selectedFile && (
              <div
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  isUploading
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                    : "border-[var(--color-input-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]/30"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <CloudArrowUpIcon className="mx-auto h-10 w-10 text-[var(--color-body-muted)]" />
                <p className="mt-2 text-sm text-[var(--color-body)]">
                  {isUploading
                    ? "Mengupload..."
                    : "Tarik & lepas file di sini, atau klik untuk pilih"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-body-muted)]">
                  Maksimal 5MB · JPEG, PNG, WebP, atau GIF
                </p>
              </div>
            )}

            {/* Selected file preview & actions */}
            {selectedFile && previewUrl && (
              <div className="rounded-2xl border border-[var(--color-input-border)] bg-app-surface p-4">
                <div className="flex items-start gap-4">
                  {/* Preview thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
                    <Image
                      src={previewUrl}
                      alt={selectedFile.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-title)]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-body-muted)]">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>

                    {/* Progress bar during upload */}
                    {isUploading && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {!isUploading && (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelSelection}
                          className="flex items-center gap-1 rounded-lg border border-[var(--color-input-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-body)] transition hover:bg-[var(--color-surface-alt)] active:scale-95"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleUpload}
                          className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90 active:scale-95"
                        >
                          <CloudArrowUpIcon className="h-3.5 w-3.5" />
                          Upload
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Info ──────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-2.5">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
                  Informasi
                </p>
                <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-400">
                  Logo ini akan tampil di sidebar desktop untuk semua pengguna
                  yang sudah login. Ukuran yang disarankan: 512×512 pixel
                  (persegi) dengan format PNG atau WebP. Perubahan akan
                  diterapkan secara langsung tanpa perlu reload manual.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Confirm Clear Modal ──────────────────────────────────────────── */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-app-surface p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-[var(--color-title)]">
                Hapus Logo Kustom?
              </h3>
              <p className="mt-1.5 text-[13px] text-[var(--color-body-muted)]">
                Logo sidebar akan dikembalikan ke logo default bawaan. Tindakan
                ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 rounded-xl border border-[var(--color-input-border)] py-2.5 text-[13px] font-medium text-[var(--color-body)] transition hover:bg-[var(--color-surface-alt)] active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearLogo}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-[13px] font-medium text-white transition hover:bg-red-700 active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
