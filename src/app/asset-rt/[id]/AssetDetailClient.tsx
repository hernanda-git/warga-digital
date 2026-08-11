"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import {
  PlusIcon,
  XMarkIcon,
  ArrowLeftIcon,
  UserIcon,
  MapPinIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowPathIcon,
  CubeTransparentIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  WrenchIcon,
  DocumentTextIcon,
  PhotoIcon,
  PencilIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import type {
  AssetItem,
  AssetLog,
  AssetLogType,
  AssetUsageStatus,
  AssetLogFormState,
} from "@/types/asset-rt";
import { apiFetch } from "@/lib/api-client";

const CATEGORY_COLORS: [string, string][] = [
  ["#DBEAFE", "#1D4ED8"],
  ["#FEF3C7", "#B45309"],
  ["#EDE9FE", "#6D28D9"],
  ["#F3F4F6", "#374151"],
  ["#DCFCE7", "#15803D"],
  ["#FCE7F3", "#BE185D"],
];

function categoryColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function usageLabel(is_used: boolean | null): string {
  if (is_used === true) return "Digunakan";
  if (is_used === false) return "Tidak Digunakan";
  return "Tidak Terpakai";
}

function usageColors(is_used: boolean | null): [string, string] {
  if (is_used === true) return ["#DCFCE7", "#15803D"];
  if (is_used === false) return ["#FEF3C7", "#B45309"];
  return ["#F3F4F6", "#6B7280"];
}

function statusFromBool(is_used: boolean | null): AssetUsageStatus {
  if (is_used === true) return "used";
  if (is_used === false) return "unused";
  return "unset";
}

function formatDate(
  iso: string | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(
    "id-ID",
    opts ?? { day: "numeric", month: "short", year: "numeric" },
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return formatDate(iso, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface LogMeta {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  color: string;
  textColor: string;
}

function logMeta(type: AssetLogType): LogMeta {
  switch (type) {
    case "status_change":
      return {
        icon: ArrowsRightLeftIcon,
        label: "Perubahan Status",
        color: "#DBEAFE",
        textColor: "#1D4ED8",
      };
    case "part_replacement":
      return {
        icon: WrenchScrewdriverIcon,
        label: "Penggantian Komponen",
        color: "#FEF3C7",
        textColor: "#B45309",
      };
    case "maintenance":
      return {
        icon: WrenchIcon,
        label: "Pemeliharaan",
        color: "#EDE9FE",
        textColor: "#6D28D9",
      };
    case "general":
      return {
        icon: DocumentTextIcon,
        label: "Catatan Umum",
        color: "#F3F4F6",
        textColor: "#374151",
      };
    case "image_attachment":
      return {
        icon: PhotoIcon,
        label: "Lampiran Gambar",
        color: "#DCFCE7",
        textColor: "#15803D",
      };
    case "quantity_change":
      return {
        icon: CubeTransparentIcon,
        label: "Perubahan Jumlah",
        color: "#EDE9FE",
        textColor: "#6D28D9",
      };
    case "asset_update":
      return {
        icon: PencilIcon,
        label: "Perubahan Data",
        color: "#F3F4F6",
        textColor: "#374151",
      };
    case "expense":
      return {
        icon: BanknotesIcon,
        label: "Pengeluaran",
        color: "#FEE2E2",
        textColor: "#DC2626",
      };
    default:
      const _exhaustive: never = type;
      throw new Error(`Unknown log type: ${_exhaustive}`);
  }
}

const STATUS_LABELS: Record<AssetUsageStatus, string> = {
  used: "Digunakan",
  unused: "Tidak Digunakan",
  unset: "Tidak Terpakai",
};

function LogEntry({ log }: { log: AssetLog }) {
  const meta = logMeta(log.log_type);

  return (
    <div
      className="flex gap-3 border-b px-0 py-4 last:border-b-0"
      style={{ borderColor: "var(--color-input-border)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: meta.color, color: meta.textColor }}
      >
        <meta.icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: meta.textColor }}
          >
            {meta.label}
          </span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-app-body-muted">
            {relativeTime(log.logged_at)}
          </span>
        </div>

        {log.log_type === "status_change" && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusPill status={log.old_status} />
            <ArrowRightIcon className="h-4 w-4 text-app-body-muted" />
            <StatusPill status={log.new_status} highlight />
          </div>
        )}

        {log.log_type === "part_replacement" && (
          <div className="mt-1.5 text-[13px] text-app-body">
            <div>
              <span className="text-app-body-muted">Komponen: </span>
              <strong>{log.part_name}</strong>
            </div>
            <div>
              <span className="text-app-body-muted">Diganti dengan: </span>
              <strong>{log.replaced_with}</strong>
            </div>
            {log.notes && (
              <div className="mt-1 text-app-body-muted">{log.notes}</div>
            )}
          </div>
        )}

        {log.log_type === "image_attachment" && (
          <div className="mt-1.5 space-y-2">
            {log.image_url && (
              <img
                src={log.image_url}
                alt="Lampiran"
                className="h-32 w-full rounded-xl object-cover"
              />
            )}
            {log.notes && (
              <p className="text-[13px] leading-relaxed text-app-body">
                {log.notes}
              </p>
            )}
          </div>
        )}

        {log.log_type === "quantity_change" && (
          <div className="mt-1.5 space-y-1 text-[13px] text-app-body">
            <div className="flex items-center gap-2">
              <span className="text-app-body-muted">Jumlah:</span>
              {log.old_quantity != null && (
                <span className="font-semibold text-app-body-muted line-through">
                  {log.old_quantity}
                </span>
              )}
              {log.old_quantity != null && log.new_quantity != null && (
                <ArrowRightIcon className="h-3.5 w-3.5 text-app-body-muted" />
              )}
              {log.new_quantity != null ? (
                <span className="font-bold">{log.new_quantity}</span>
              ) : (
                <span className="italic text-app-body-muted">
                  Belum tercatat
                </span>
              )}
            </div>
            {log.notes && <p className="text-app-body-muted">{log.notes}</p>}
          </div>
        )}

        {(log.log_type === "maintenance" ||
          log.log_type === "general" ||
          log.log_type === "asset_update") &&
          log.notes && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-app-body">
              {log.notes}
            </p>
          )}

        {log.logged_by_full_name && (
          <div className="mt-2 flex items-center gap-1">
            <UserIcon className="h-3 w-3 text-app-body-muted" />
            <span className="text-[11px] text-app-body-muted">
              {log.logged_by_full_name}
            </span>
            <span className="text-[11px] text-app-body-muted">·</span>
            <span className="text-[11px] text-app-body-muted">
              {formatDate(log.logged_at, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  highlight,
}: {
  status: AssetUsageStatus | null;
  highlight?: boolean;
}) {
  const label = status ? STATUS_LABELS[status] : "—";
  const colors: Record<AssetUsageStatus, [string, string]> = {
    used: ["#DCFCE7", "#15803D"],
    unused: ["#FEF3C7", "#B45309"],
    unset: ["#F3F4F6", "#6B7280"],
  };
  const [bg, text] = status ? colors[status] : ["#F3F4F6", "#9CA3AF"];

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: bg,
        color: text,
        border: highlight ? `1.5px solid ${text}` : "none",
      }}
    >
      {label}
    </span>
  );
}

const EMPTY_FORM: AssetLogFormState = {
  log_type: "general",
  new_status: "used",
  part_name: "",
  replaced_with: "",
  notes: "",
  imageFile: null,
  imagePreview: "",
  new_quantity: "",
};

function AddLogSheet({
  assetId,
  currentStatus,
  currentQuantity,
  onClose,
  onSaved,
}: {
  assetId: string;
  currentStatus: boolean | null;
  currentQuantity: number;
  onClose: () => void;
  onSaved: (log: AssetLog) => void;
}) {
  const [form, setForm] = useState<AssetLogFormState>({
    ...EMPTY_FORM,
    new_status: statusFromBool(currentStatus),
    new_quantity: String(currentQuantity),
  });
  const [isPending, startTransition] = useTransition();
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof AssetLogFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageFile: file }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({
        ...f,
        imagePreview: (ev.target?.result as string) ?? "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm((f) => ({ ...f, imageFile: null, imagePreview: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!form.imageFile) return null;
    setImageUploading(true);
    try {
      // Server-side upload (no browser→R2 CORS/presigned issues)
      const body = new FormData();
      body.append("file", form.imageFile);

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
      setError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Upload image first if needed
        let imageUrl: string | null = null;
        if (form.log_type === "image_attachment" && form.imageFile) {
          imageUrl = await uploadImage();
          if (!imageUrl) {
            // uploadImage already set the error
            return;
          }
        }

        const body: Record<string, unknown> = { log_type: form.log_type };
        if (form.log_type === "status_change")
          body.new_status = form.new_status;
        if (form.log_type === "part_replacement") {
          body.part_name = form.part_name;
          body.replaced_with = form.replaced_with;
          if (form.notes) body.notes = form.notes;
        }
        if (form.log_type === "maintenance" || form.log_type === "general") {
          body.notes = form.notes;
        }
        if (form.log_type === "image_attachment") {
          body.image_url = imageUrl;
          body.notes = form.notes;
        }
        if (form.log_type === "quantity_change") {
          body.new_quantity = Number(form.new_quantity);
          if (form.notes) body.notes = form.notes;
        }

        const res = await apiFetch(`/api/asset-rt/${assetId}/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error?.message ?? "Gagal menyimpan log");
          return;
        }
        onSaved(data.data.log);
        onClose();
      } catch (e) {
        setError(String(e));
      }
    });
  };

  const TYPE_OPTIONS: { value: AssetLogType; label: string }[] = [
    { value: "general", label: "Catatan Umum" },
    { value: "status_change", label: "Ubah Status" },
    { value: "part_replacement", label: "Ganti Komponen" },
    { value: "maintenance", label: "Pemeliharaan" },
    { value: "image_attachment", label: "Lampiran Gambar" },
    { value: "quantity_change", label: "Ubah Jumlah" },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
          maxHeight: "90vh",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Tambah riwayat"
      >
        <div className="flex justify-center pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>

        <div
          className="overflow-y-auto px-5 pb-8 pt-3"
          style={{ maxHeight: "calc(90vh - 24px)" }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-app-title">
                Tambah Riwayat
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                Catat perubahan atau pemeliharaan aset
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90"
              aria-label="Tutup"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" />
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((t) => {
              const meta = logMeta(t.value);
              const active = form.log_type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => {
                    set("log_type", t.value);
                    if (t.value === "quantity_change") {
                      set("new_quantity", String(currentQuantity));
                    }
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-xl p-2.5 text-left transition-all"
                  style={{
                    border: active
                      ? `2px solid ${meta.textColor}`
                      : "2px solid var(--color-input-border)",
                    background: active
                      ? meta.color
                      : "var(--color-surface-alt)",
                  }}
                >
                  <meta.icon
                    className="h-5 w-5"
                    style={{ color: meta.textColor }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: active ? meta.textColor : "var(--color-body)",
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {form.log_type === "status_change" && (
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Status Baru
              </label>
              <div className="flex gap-2">
                {(["used", "unused", "unset"] as AssetUsageStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => set("new_status", s)}
                      className="flex-1 cursor-pointer rounded-xl px-1 py-2 text-xs font-bold transition-all"
                      style={{
                        border:
                          form.new_status === s
                            ? "2px solid var(--color-primary)"
                            : "2px solid var(--color-input-border)",
                        background:
                          form.new_status === s
                            ? "var(--color-primary)"
                            : "var(--color-surface-alt)",
                        color:
                          form.new_status === s ? "#fff" : "var(--color-body)",
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {form.log_type === "part_replacement" && (
            <>
              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Nama Komponen <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  placeholder="cth. Baterai, Layar, Filter"
                  value={form.part_name}
                  onChange={(e) => set("part_name", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Diganti Dengan <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  placeholder="cth. Baterai Samsung 5000mAh"
                  value={form.replaced_with}
                  onChange={(e) => set("replaced_with", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Catatan Tambahan
                </label>
                <textarea
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none resize-none"
                  style={{
                    borderColor: "var(--color-input-border)",
                    height: 80,
                  }}
                  placeholder="Keterangan opsional…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
            </>
          )}

          {form.log_type === "image_attachment" && (
            <>
              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Gambar <span className="text-[#EF4444]">*</span>
                </label>
                <div
                  className="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 transition-colors"
                  style={{
                    borderColor: form.imagePreview
                      ? "var(--color-primary)"
                      : "var(--color-input-border)",
                    background: form.imagePreview
                      ? "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))"
                      : "var(--color-surface)",
                  }}
                  onClick={() =>
                    !form.imagePreview && fileInputRef.current?.click()
                  }
                >
                  {form.imagePreview ? (
                    <div className="relative w-full">
                      <img
                        src={form.imagePreview}
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
                          Unggah Gambar
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
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Catatan <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none resize-none"
                  style={{
                    borderColor: "var(--color-input-border)",
                    height: 80,
                  }}
                  placeholder="Catatan tentang gambar ini…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
            </>
          )}

          {form.log_type === "quantity_change" && (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-app-surface-alt p-4">
                <div className="flex-1 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Sebelumnya
                  </span>
                  <p className="mt-0.5 text-xl font-extrabold text-app-body-muted line-through">
                    {currentQuantity}
                  </p>
                </div>
                <ArrowRightIcon className="h-5 w-5 shrink-0 text-app-body-muted" />
                <div className="flex-1 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Sekarang
                  </span>
                  <p
                    className="mt-0.5 text-xl font-extrabold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {form.new_quantity || "—"}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Jumlah Baru <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  placeholder="cth. 10"
                  value={form.new_quantity}
                  onChange={(e) => set("new_quantity", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                  Catatan
                </label>
                <textarea
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none resize-none"
                  style={{
                    borderColor: "var(--color-input-border)",
                    height: 80,
                  }}
                  placeholder="Alasan perubahan jumlah…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                  }}
                />
              </div>
            </>
          )}

          {(form.log_type === "maintenance" || form.log_type === "general") && (
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                Catatan <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none resize-none"
                style={{
                  borderColor: "var(--color-input-border)",
                  height: 100,
                }}
                placeholder={
                  form.log_type === "maintenance"
                    ? "Deskripsikan pekerjaan pemeliharaan…"
                    : "Tulis catatan…"
                }
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                }}
              />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-[13px] text-[#991B1B]">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || imageUploading}
            className="w-full cursor-pointer rounded-2xl border-none px-4 py-3.5 text-sm font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background:
                isPending || imageUploading
                  ? "var(--color-body-muted)"
                  : "var(--color-primary)",
              boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
            }}
          >
            {imageUploading
              ? "Mengunggah…"
              : isPending
                ? "Menyimpan…"
                : "Simpan Riwayat"}
          </button>
        </div>
      </div>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-app-surface p-4 shadow-sm">
      <div className="mb-0.5 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-app-body-muted" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
          {label}
        </span>
      </div>
      <div className="text-base font-extrabold text-app-title">{value}</div>
      {sub && <div className="text-xs text-app-body-muted">{sub}</div>}
    </div>
  );
}

export default function AssetDetailClient({
  asset,
  initialLogs,
}: {
  asset: AssetItem;
  initialLogs: AssetLog[];
}) {
  const [logs, setLogs] = useState<AssetLog[]>(initialLogs);
  const [currentAsset, setCurrentAsset] = useState<AssetItem>(asset);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogSaved = useCallback((newLog: AssetLog) => {
    setLogs((prev) => [newLog, ...prev]);
    setCurrentAsset((a) => ({
      ...a,
      updated_at: new Date().toISOString(),
      updated_by_full_name: newLog.logged_by_full_name,
      is_used:
        newLog.log_type === "status_change" && newLog.new_status
          ? newLog.new_status === "used"
            ? true
            : newLog.new_status === "unused"
              ? false
              : null
          : a.is_used,
      quantity:
        newLog.log_type === "quantity_change" && newLog.new_quantity != null
          ? newLog.new_quantity
          : a.quantity,
      notes:
        newLog.log_type === "general" && newLog.notes != null
          ? newLog.notes
          : a.notes,
    }));
  }, []);

  const [catBg, catText] = currentAsset.category
    ? categoryColor(currentAsset.category.name)
    : ["#F3F4F6", "#6B7280"];

  const [uBg, uText] = usageColors(currentAsset.is_used);

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* ===== HEADER: hero + image + info cards ===== */}
        <div>
          {/* Hero strip */}
          <div
            className="relative shrink-0 overflow-hidden"
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

            <div className="relative px-4 pb-5 pt-5 text-white">
              <Link
                href="/asset-rt"
                className="mb-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/70 no-underline"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Inventaris
              </Link>

              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {currentAsset.category && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ background: catBg, color: catText }}
                  >
                    {currentAsset.category.name}
                  </span>
                )}
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: uBg, color: uText }}
                >
                  {usageLabel(currentAsset.is_used)}
                </span>
              </div>

              <div className="flex items-end justify-between gap-3">
                <h1 className="text-lg font-extrabold leading-tight text-white">
                  {currentAsset.name}
                </h1>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Riwayat
                  </button>
                )}
              </div>

              {currentAsset.location && (
                <div className="mt-1 flex items-center gap-1 text-white/60">
                  <MapPinIcon className="h-4 w-4" />
                  <span className="text-[13px]">{currentAsset.location}</span>
                </div>
              )}

              {currentAsset.description && (
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                  {currentAsset.description}
                </p>
              )}
            </div>
          </div>

          {/* Image card + Info cards */}
          <div className="lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
            <div className="px-0 pb-2 lg:px-0">
              {/* Image card */}
              {currentAsset.image_url && (
                <div className="-mx-4 mb-4 overflow-hidden shadow-sm lg:mx-0 lg:rounded-2xl">
                  <img
                    src={currentAsset.image_url}
                    alt={currentAsset.name}
                    className="h-56 w-full object-cover"
                  />
                </div>
              )}

              {/* Info cards grid */}
              <div className="mb-2 grid grid-cols-2 gap-2.5 px-4 lg:px-0">
                <InfoCard
                  icon={CubeTransparentIcon}
                  label="Jumlah"
                  value={`${currentAsset.quantity} ${currentAsset.unit_label}`}
                />
                <InfoCard
                  icon={CalendarDaysIcon}
                  label="Tgl. Pembelian"
                  value={formatDate(currentAsset.purchase_date)}
                />
                <InfoCard
                  icon={ClockIcon}
                  label="Ditambahkan"
                  value={formatDate(currentAsset.created_at)}
                  sub={currentAsset.created_by_full_name ?? undefined}
                />
                <InfoCard
                  icon={ArrowPathIcon}
                  label="Diperbarui"
                  value={
                    currentAsset.updated_at
                      ? relativeTime(currentAsset.updated_at)
                      : "—"
                  }
                  sub={currentAsset.updated_by_full_name ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== CONTENT: tags, notes, riwayat ===== */}
        <div className="lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
          <section className="px-4 pb-6 lg:px-0">
            {currentAsset.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {currentAsset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-app-body"
                    style={{ borderColor: "var(--color-input-border)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {currentAsset.notes && (
              <div className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
                <div className="mb-1 flex items-center gap-1">
                  <InformationCircleIcon className="h-4 w-4 text-[#B45309]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#B45309]">
                    Catatan Aset
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-[#78350F]">
                  {currentAsset.notes}
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-app-surface p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-app-title">
                  Riwayat Aset
                </h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold text-app-body-muted"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  {logs.length} entri
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-9 text-app-body-muted">
                  <ClockIcon className="h-10 w-10 opacity-40" />
                  <span className="text-[13px]">Belum ada riwayat</span>
                </div>
              ) : (
                <div>
                  {logs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="h-8" />
        </div>
      </div>

      {sheetOpen && (
        <AddLogSheet
          assetId={currentAsset.id}
          currentStatus={currentAsset.is_used}
          currentQuantity={currentAsset.quantity}
          onClose={() => setSheetOpen(false)}
          onSaved={handleLogSaved}
        />
      )}
    </main>
  );
}
