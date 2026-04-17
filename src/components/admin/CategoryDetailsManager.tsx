"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryDetail {
  id: string;
  category_id: string;
  name: string;
  rate_per_warga: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), 3800);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);

  const bg =
    toast.type === "success"
      ? "bg-emerald-600"
      : toast.type === "error"
        ? "bg-red-600"
        : "bg-amber-500";

  const Icon =
    toast.type === "success"
      ? CheckCircleIcon
      : toast.type === "error"
        ? ExclamationTriangleIcon
        : InformationCircleIcon;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-white shadow-lg ${bg}`}
      style={{
        animation: "toastIn 260ms cubic-bezier(0.22,1,0.36,1) forwards",
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0 rounded-full p-0.5 opacity-70 hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-app-surface shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-app-surface-alt" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-app-surface-alt" />
        </div>
      </div>
    </div>
  );
}

// ─── Form sheet ───────────────────────────────────────────────────────────────

interface FormSheetProps {
  categoryId: string;
  editing: CategoryDetail | null;
  onClose: () => void;
  onSaved: (detail: CategoryDetail) => void;
  onToast: (msg: string, type: ToastState["type"]) => void;
}

function DetailFormSheet({
  categoryId,
  editing,
  onClose,
  onSaved,
  onToast,
}: FormSheetProps) {
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [ratePerWarga, setRatePerWarga] = useState(
    editing?.rate_per_warga?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus(), 220);
    return () => window.clearTimeout(t);
  }, []);

  const isValid = name.trim().length > 0 && name.trim().length <= 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    const rate = Number(ratePerWarga) || 0;
    if (rate < 0) {
      setFormError("Rate per warga harus berupa angka positif.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      category_id: categoryId,
      name: name.trim(),
      rate_per_warga: rate,
      is_active: isActive,
    };

    try {
      const res = await apiFetch(
        isEdit
          ? `/api/admin/kas-rt-category-details/${editing!.id}`
          : "/api/admin/kas-rt-category-details",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        detail?: CategoryDetail;
        error?: string;
      };

      if (!res.ok) {
        setFormError(body.error ?? "Terjadi kesalahan.");
        return;
      }

      if (body.detail) {
        onSaved(body.detail);
        onToast(
          isEdit
            ? "Detail kategori berhasil diperbarui."
            : "Detail kategori berhasil ditambahkan.",
          "success",
        );
        onClose();
      }
    } catch {
      setFormError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: "fadeIn 200ms ease forwards" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] overflow-hidden rounded-t-3xl bg-app-surface shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.25)]"
        style={{
          animation: "slideUp 240ms cubic-bezier(0.22,1,0.36,1) forwards",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit detail kategori" : "Tambah detail kategori"}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-app-body-muted/25" />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pb-3 pt-1"
            style={{ borderBottom: "1px solid var(--color-input-border)" }}
          >
            <div>
              <h2 className="text-base font-bold text-app-title">
                {isEdit ? "Edit Detail" : "Tambah Detail Baru"}
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                {isEdit
                  ? "Ubah rate per warga untuk detail ini"
                  : "Detail baru akan digunakan untuk kalkulasi otomatis"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-full text-app-body-muted transition hover:bg-app-surface-alt disabled:opacity-50"
              aria-label="Tutup"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[72dvh] overflow-y-auto px-5 pb-6 pt-4 space-y-5">
            {/* Error banner */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs font-medium text-red-700">{formError}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-app-body">
                Nama Detail <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="cth. Satpam + Sampah, Kas RW…"
                className="w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3.5 py-2.5 text-sm text-app-body placeholder:text-app-body-muted/60 outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,white_84%)]"
              />
              <p className="mt-1 text-right text-[10px] text-app-body-muted">
                {name.trim().length}/100
              </p>
            </div>

            {/* Rate per warga */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-app-body">
                Rate per Warga <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-input-border)] bg-white px-3.5 py-2.5">
                <span className="text-sm font-bold text-app-body-muted">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ratePerWarga}
                  onChange={(e) =>
                    setRatePerWarga(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-app-body-muted">
                Jumlah per warga yang akan dikalikan dengan jumlah warga aktif
              </p>
            </div>

            {/* Active toggle */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-app-body">
                Status
              </p>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border px-3.5 py-3 transition"
                style={
                  isActive
                    ? {
                        borderColor: "var(--color-primary)",
                        background:
                          "color-mix(in srgb, var(--color-primary) 6%, white)",
                      }
                    : {
                        borderColor: "var(--color-input-border)",
                        background: "white",
                      }
                }
              >
                <span
                  className="text-sm font-medium"
                  style={
                    isActive
                      ? { color: "var(--color-primary)" }
                      : { color: "var(--color-body-muted)" }
                  }
                >
                  {isActive ? "Detail aktif" : "Detail nonaktif"}
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${isActive ? "" : "bg-gray-200"}`}
                  style={isActive ? { background: "var(--color-primary)" } : {}}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      isActive ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
            style={{ borderTop: "1px solid var(--color-input-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-app-body-muted transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {submitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Detail"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  detail: CategoryDetail;
  confirming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({
  detail,
  confirming,
  error,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        style={{ animation: "fadeIn 180ms ease forwards" }}
        onClick={onCancel}
      />
      <div
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-[360px] -translate-y-1/2 overflow-hidden rounded-3xl bg-app-surface shadow-2xl"
        style={{
          animation: "fadeInScale 220ms cubic-bezier(0.22,1,0.36,1) forwards",
        }}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <TrashIcon className="h-7 w-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-app-title">
            Hapus Detail Kategori?
          </h3>
          <p className="mt-2 text-sm text-app-body-muted leading-relaxed">
            Detail{" "}
            <span className="font-semibold text-app-body">
              &ldquo;{detail.name}&rdquo;
            </span>{" "}
            (Rate: {formatRupiah(detail.rate_per_warga)}/warga) akan dihapus
            permanen.
          </p>

          {error && (
            <div className="mt-3 w-full rounded-xl bg-red-50 px-3.5 py-2.5">
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div
          className="flex gap-3 px-5 pb-5"
          style={{ borderTop: "1px solid var(--color-input-border)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-2xl border border-[var(--color-input-border)] py-2.5 text-sm font-semibold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Menghapus…
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Ya, Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Detail card ──────────────────────────────────────────────────────────────

interface DetailCardProps {
  detail: CategoryDetail;
  onEdit: () => void;
  onDelete: () => void;
}

function DetailCard({ detail, onEdit, onDelete }: DetailCardProps) {
  return (
    <div className="group relative flex overflow-hidden rounded-xl bg-app-surface shadow-sm transition hover:shadow-md">
      {/* Left accent bar */}
      <div className="w-1 shrink-0 bg-emerald-500" />

      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <ActivePill active={detail.is_active} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-app-surface-alt hover:text-app-title active:scale-90"
              aria-label={`Edit detail ${detail.name}`}
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-red-50 hover:text-red-600 active:scale-90"
              aria-label={`Hapus detail ${detail.name}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Name */}
        <p className="text-sm font-bold leading-tight text-app-title">
          {detail.name}
        </p>

        {/* Rate */}
        <div className="flex items-center gap-1.5">
          <CurrencyDollarIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <p className="text-xs font-semibold text-emerald-600">
            {formatRupiah(detail.rate_per_warga)} / warga
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CategoryDetailsManagerProps {
  categoryId: string;
  categoryName: string;
}

export default function CategoryDetailsManager({
  categoryId,
  categoryName,
}: CategoryDetailsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState<CategoryDetail[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // CRUD
  const [showFormSheet, setShowFormSheet] = useState(false);
  const [editingDetail, setEditingDetail] = useState<CategoryDetail | null>(
    null,
  );
  const [deletingDetail, setDeletingDetail] = useState<CategoryDetail | null>(
    null,
  );
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastCounterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      toastCounterRef.current += 1;
      const id = toastCounterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load details
  const loadDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const res = await apiFetch(
        `/api/admin/kas-rt-category-details?category_id=${categoryId}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Gagal memuat detail kategori.");
        return;
      }
      const data = (await res.json()) as { details: CategoryDetail[] };
      setDetails(data.details);
    } catch {
      setLoadError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  // CRUD handlers
  const handleSaved = useCallback((detail: CategoryDetail) => {
    setDetails((prev) => {
      const idx = prev.findIndex((d) => d.id === detail.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = detail;
        return next;
      }
      return [...prev, detail];
    });
  }, []);

  const openEdit = useCallback((detail: CategoryDetail) => {
    setEditingDetail(detail);
    setShowFormSheet(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditingDetail(null);
    setShowFormSheet(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowFormSheet(false);
    setEditingDetail(null);
  }, []);

  const openDeleteConfirm = useCallback((detail: CategoryDetail) => {
    setDeletingDetail(detail);
    setDeleteError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingDetail) return;
    setDeleteConfirming(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(
        `/api/admin/kas-rt-category-details/${deletingDetail.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(body.error ?? "Gagal menghapus detail kategori.");
        return;
      }

      setDetails((prev) => prev.filter((d) => d.id !== deletingDetail.id));
      showToast(
        `Detail "${deletingDetail.name}" berhasil dihapus.`,
        "success",
      );
      setDeletingDetail(null);
    } catch {
      setDeleteError("Gagal terhubung ke server.");
    } finally {
      setDeleteConfirming(false);
    }
  }, [deletingDetail, showToast]);

  // Derived
  const activeDetails = useMemo(
    () => details.filter((d) => d.is_active),
    [details],
  );

  const totalRate = useMemo(
    () => activeDetails.reduce((sum, d) => sum + d.rate_per_warga, 0),
    [activeDetails],
  );

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-input-border)] bg-app-surface-alt p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-app-title">
            Detail Kategori: {categoryName}
          </h4>
          <p className="mt-0.5 text-xs text-app-body-muted">
            {details.length} detail · Total rate: {formatRupiah(totalRate)}
            /warga
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDetails(true)}
            disabled={refreshing || loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-app-surface-alt disabled:opacity-50"
            aria-label="Segarkan"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
            style={{ background: "var(--color-primary)" }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Tambah
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {loading && !refreshing ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <p className="text-xs text-red-700">{loadError}</p>
          </div>
        ) : details.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-6 text-center">
            <CurrencyDollarIcon className="h-8 w-8 text-app-body-muted/30" />
            <p className="text-xs font-medium text-app-body-muted">
              Belum ada detail kategori
            </p>
            <p className="text-[10px] text-app-body-muted/70">
              Tambahkan detail untuk kalkulasi otomatis
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {details.map((detail) => (
              <DetailCard
                key={detail.id}
                detail={detail}
                onEdit={() => openEdit(detail)}
                onDelete={() => openDeleteConfirm(detail)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form sheet */}
      {showFormSheet && (
        <DetailFormSheet
          categoryId={categoryId}
          editing={editingDetail}
          onClose={closeForm}
          onSaved={handleSaved}
          onToast={showToast}
        />
      )}

      {/* Delete confirm modal */}
      {deletingDetail && (
        <DeleteConfirmModal
          detail={deletingDetail}
          confirming={deleteConfirming}
          error={deleteError}
          onCancel={() => {
            if (!deleteConfirming) setDeletingDetail(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      {/* Toasts */}
      <div
        className="pointer-events-none fixed bottom-24 inset-x-4 z-[60] mx-auto flex max-w-[400px] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </div>
  );
}

