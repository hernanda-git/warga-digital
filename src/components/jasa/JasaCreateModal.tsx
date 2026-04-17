"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { DaySelector } from "./DaySelector";
import { TimeRangePicker } from "./TimeRangePicker";

interface JasaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  categories: Array<{ id: string; name: string; icon: string | null }>;
  isLoading?: boolean;
}

const DEFAULT_DAYS: Record<string, boolean> = {
  senin: true,
  selasa: true,
  rabu: true,
  kamis: true,
  jumat: true,
  sabtu: true,
  minggu: false,
  tanggal_merah: false,
};

const STEPS = [
  { label: "Info Dasar", short: "Info", emoji: "📋" },
  { label: "Jadwal", short: "Jadwal", emoji: "🗓" },
  { label: "Kontak & Foto", short: "Foto", emoji: "📸" },
] as const;

type AdditionalFile = { id: string; file: File; preview: string };

export function JasaCreateModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  isLoading = false,
}: JasaCreateModalProps) {
  const [step, setStep] = useState(1);
  const [closing, setClosing] = useState(false);

  const [formState, setFormState] = useState({
    name: "",
    description: "",
    summary: "",
    estimated_price: "",
    category_id: "",
    hari_operasional: DEFAULT_DAYS,
    jam_operasional_mulai: "08:00",
    jam_operasional_selesai: "17:00",
    is_available: true,
    wa_number: "",
    location_note: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(
    null,
  );
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryImageInputRef = useRef<HTMLInputElement>(null);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setClosing(false);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Reset form on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const resetForm = () => {
        setFormState({
          name: "",
          description: "",
          summary: "",
          estimated_price: "",
          category_id: "",
          hari_operasional: DEFAULT_DAYS,
          jam_operasional_mulai: "08:00",
          jam_operasional_selesai: "17:00",
          is_available: true,
          wa_number: "",
          location_note: "",
        });
      };
      // Revoke stale blob URLs using setState callbacks to access current values
      setPrimaryImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAdditionalFiles((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.preview));
        return [];
      });
      setPrimaryImageFile(null);
      setErrors({});
      if (primaryImageInputRef.current) primaryImageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  // ── Close handler ─────────────────────────────────────────────────────────
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 260);
  };

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleDayChange = (days: Record<string, boolean>) => {
    setFormState((prev) => ({ ...prev, hari_operasional: days }));
    if (errors.hari_operasional)
      setErrors((prev) => ({ ...prev, hari_operasional: "" }));
  };

  const handleTimeChange = (start: string, end: string) => {
    setFormState((prev) => ({
      ...prev,
      jam_operasional_mulai: start,
      jam_operasional_selesai: end,
    }));
    if (errors.jam_operasional)
      setErrors((prev) => ({ ...prev, jam_operasional: "" }));
  };

  const handleStatusChange = (isAvailable: boolean) => {
    setFormState((prev) => ({ ...prev, is_available: isAvailable }));
  };

  const handlePrimaryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        primary_image: "Hanya file JPG, PNG, atau WebP yang diperbolehkan",
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        primary_image: "Ukuran file maksimal 5MB",
      }));
      return;
    }

    setPrimaryImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPrimaryImageFile(file);
    setErrors((prev) => ({ ...prev, primary_image: "" }));
  };

  const handleAdditionalImagesUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    setAdditionalFiles((prev) => {
      if (prev.length + newFiles.length > 5) {
        setErrors((p) => ({ ...p, image: "Maksimal 5 gambar tambahan" }));
        return prev;
      }
      const entries: AdditionalFile[] = newFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
      setErrors((p) => ({ ...p, image: "" }));
      return [...prev, ...entries];
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteImage = (id: string, isPrimary: boolean) => {
    if (isPrimary) {
      setPrimaryImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPrimaryImageFile(null);
      if (primaryImageInputRef.current) primaryImageInputRef.current.value = "";
    } else {
      setAdditionalFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (target) URL.revokeObjectURL(target.preview);
        return prev.filter((f) => f.id !== id);
      });
    }
  };

  // ── Per-step validation ───────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!formState.name.trim()) newErrors.name = "Nama layanan harus diisi";
      if (!formState.category_id) newErrors.category_id = "Pilih kategori";
      if (
        !formState.estimated_price ||
        isNaN(parseFloat(formState.estimated_price)) ||
        parseFloat(formState.estimated_price) < 0
      ) {
        newErrors.estimated_price = "Harga tidak valid";
      }
    }

    if (s === 2) {
      const hasActiveDay = Object.values(formState.hari_operasional).some(
        Boolean,
      );
      if (!hasActiveDay)
        newErrors.hari_operasional = "Pilih minimal satu hari operasional";
      if (
        !formState.jam_operasional_mulai ||
        !formState.jam_operasional_selesai
      ) {
        newErrors.jam_operasional = "Jam operasional harus diisi";
      } else if (
        formState.jam_operasional_mulai >= formState.jam_operasional_selesai
      ) {
        newErrors.jam_operasional = "Jam mulai harus sebelum jam selesai";
      }
    }

    if (s === 3) {
      if (!primaryImageFile)
        newErrors.primary_image = "Upload minimal 1 gambar utama";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      const submitFormData = new FormData();
      submitFormData.append("name", formState.name);
      submitFormData.append("description", formState.description);
      submitFormData.append("summary", formState.summary);
      submitFormData.append("estimated_price", formState.estimated_price);
      submitFormData.append("category_id", formState.category_id);
      submitFormData.append(
        "hari_operasional",
        JSON.stringify(formState.hari_operasional),
      );
      submitFormData.append(
        "jam_operasional_mulai",
        formState.jam_operasional_mulai,
      );
      submitFormData.append(
        "jam_operasional_selesai",
        formState.jam_operasional_selesai,
      );
      submitFormData.append("is_available", formState.is_available.toString());
      submitFormData.append("wa_number", formState.wa_number);
      submitFormData.append("location_note", formState.location_note);

      if (primaryImageFile) {
        submitFormData.append("primary_image", primaryImageFile);
      }

      additionalFiles.forEach(({ file }) => {
        submitFormData.append("additional_images", file);
      });

      await onSubmit(submitFormData);
      handleClose();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal membuat layanan";
      setErrors((prev) => ({ ...prev, submit: msg }));
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isOpen && !closing) return null;

  const stepInfo = STEPS[step - 1];
  const progressPct = (step / 3) * 100;

  const allImages = [
    ...(primaryImageFile && primaryImagePreview
      ? [
          {
            id: "primary",
            url: primaryImagePreview,
            name: primaryImageFile.name,
            isPrimary: true,
          },
        ]
      : []),
    ...additionalFiles.map((f) => ({
      id: f.id,
      url: f.preview,
      name: f.file.name,
      isPrimary: false,
    })),
  ];

  // ── Shared input style helpers ─────────────────────────────────────────────
  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    border: `1.5px solid ${hasError ? "#ef4444" : "var(--color-input-border)"}`,
    background: "var(--color-surface)",
    color: "var(--color-body)",
  });

  const dashedAreaStyle = (
    hasError?: boolean,
    hasContent?: boolean,
  ): React.CSSProperties => ({
    border: `2px dashed ${hasError ? "#ef4444" : "var(--color-input-border)"}`,
    background: hasError
      ? "color-mix(in srgb, #ef4444 6%, var(--color-surface))"
      : hasContent
        ? "color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))"
        : "var(--color-surface-alt)",
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeOut  { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideDown { from { transform: translate(-50%, 0); } to { transform: translate(-50%, 100%); } }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: closing
            ? "fadeOut 0.26s ease forwards"
            : "fadeIn 0.22s ease",
        }}
        onClick={handleClose}
      />

      {/* ── Sheet panel ──────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-3xl bg-app-surface"
        style={{
          maxHeight: "92dvh",
          boxShadow: "0 -8px 40px -8px rgba(0,0,0,0.22)",
          animation: closing
            ? "slideDown 0.26s ease forwards"
            : "slideUp 0.3s ease",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 justify-center pb-1 pt-3"
          onClick={handleClose}
          role="button"
          aria-label="Tutup"
        >
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 pb-3 pt-1"
          style={{ borderBottom: "1px solid var(--color-input-border)" }}
        >
          {/* Row: back · title · close */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: back button */}
            <div className="flex shrink-0">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity active:opacity-70"
                  style={{ background: "var(--color-surface-alt)" }}
                  aria-label="Kembali"
                >
                  <ArrowLeftIcon
                    className="h-4 w-4"
                    style={{ color: "var(--color-body)" }}
                  />
                </button>
              ) : (
                <div className="h-8 w-8" />
              )}
            </div>

            {/* Center: step info */}
            <div className="min-w-0 flex-1 text-center">
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--color-body-muted)" }}
              >
                Langkah {step} dari 3
              </p>
              <h2
                className="truncate text-sm font-bold leading-tight"
                style={{ color: "var(--color-title)" }}
              >
                {stepInfo.emoji} {stepInfo.label}
              </h2>
            </div>

            {/* Right: close button */}
            <div className="flex shrink-0">
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity active:opacity-70"
                style={{ background: "var(--color-surface-alt)" }}
                aria-label="Tutup"
              >
                <XMarkIcon
                  className="h-4 w-4"
                  style={{ color: "var(--color-body-muted)" }}
                />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--color-surface-alt)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: "var(--color-primary)",
              }}
            />
          </div>

          {/* Step dots */}
          <div className="mt-2.5 flex items-center justify-center">
            {STEPS.map((s, i) => {
              const sNum = i + 1;
              const isActive = sNum === step;
              const isDone = sNum < step;
              return (
                <div key={i} className="flex items-center">
                  <div className="flex items-center gap-1">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200"
                      style={{
                        background:
                          isActive || isDone
                            ? "var(--color-primary)"
                            : "var(--color-surface-alt)",
                        color:
                          isActive || isDone
                            ? "white"
                            : "var(--color-body-muted)",
                      }}
                    >
                      {isDone ? "✓" : sNum}
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{
                        color: isActive
                          ? "var(--color-primary)"
                          : "var(--color-body-muted)",
                      }}
                    >
                      {s.short}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="mx-2 h-px w-6 shrink-0"
                      style={{
                        background: isDone
                          ? "var(--color-primary)"
                          : "var(--color-input-border)",
                        transition: "background 0.3s",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {/* ════════════════════ STEP 1 – Info Dasar ════════════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Nama Layanan */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Nama Layanan <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Service AC, Pengecatan, dll"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle(!!errors.name)}
                />
                {errors.name && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Kategori – 2-column pill grid */}
              <div>
                <label
                  className="mb-2 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Kategori <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isSel = formState.category_id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormState((p) => ({
                            ...p,
                            category_id: cat.id,
                          }));
                          setErrors((p) => ({ ...p, category_id: "" }));
                        }}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all active:scale-[0.97]"
                        style={{
                          border: isSel
                            ? "1.5px solid var(--color-primary)"
                            : "1.5px solid var(--color-input-border)",
                          background: isSel
                            ? "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))"
                            : "var(--color-surface)",
                          color: isSel
                            ? "var(--color-primary)"
                            : "var(--color-body)",
                          fontWeight: isSel ? 600 : 400,
                        }}
                      >
                        <span className="shrink-0 text-xl leading-none">
                          {cat.icon || "🔧"}
                        </span>
                        <span className="truncate leading-snug">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.category_id && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.category_id}
                  </p>
                )}
              </div>

              {/* Estimasi Harga */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Estimasi Harga <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    Rp
                  </span>
                  <input
                    type="number"
                    name="estimated_price"
                    value={formState.estimated_price}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    placeholder="0"
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none"
                    style={inputStyle(!!errors.estimated_price)}
                  />
                </div>
                {errors.estimated_price && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.estimated_price}
                  </p>
                )}
              </div>

              {/* Deskripsi */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Deskripsi{" "}
                  <span
                    className="font-normal text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    (opsional)
                  </span>
                </label>
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Jelaskan detail layanan yang Anda tawarkan..."
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle()}
                />
              </div>

              {/* Ringkasan */}
              <div>
                <label
                  className="mb-1 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Ringkasan{" "}
                  <span
                    className="font-normal text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    (opsional)
                  </span>
                </label>
                <p
                  className="mb-1.5 text-xs"
                  style={{ color: "var(--color-body-muted)" }}
                >
                  Teks pendek untuk preview card
                </p>
                <textarea
                  name="summary"
                  value={formState.summary}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Ringkasan singkat..."
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle()}
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════ STEP 2 – Jadwal ═══════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Day Selector */}
              <div
                className="rounded-2xl p-4"
                style={{
                  border: `1.5px solid ${errors.hari_operasional ? "#ef4444" : "var(--color-input-border)"}`,
                  background: "var(--color-surface-alt)",
                }}
              >
                <DaySelector
                  value={formState.hari_operasional}
                  onChange={handleDayChange}
                />
                {errors.hari_operasional && (
                  <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                    {errors.hari_operasional}
                  </p>
                )}
              </div>

              {/* Time Range Picker */}
              <div
                className="rounded-2xl p-4"
                style={{
                  border: `1.5px solid ${errors.jam_operasional ? "#ef4444" : "var(--color-input-border)"}`,
                  background: "var(--color-surface-alt)",
                }}
              >
                <TimeRangePicker
                  startTime={formState.jam_operasional_mulai}
                  endTime={formState.jam_operasional_selesai}
                  onStartChange={(time) =>
                    handleTimeChange(time, formState.jam_operasional_selesai)
                  }
                  onEndChange={(time) =>
                    handleTimeChange(formState.jam_operasional_mulai, time)
                  }
                />
                {errors.jam_operasional && (
                  <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                    {errors.jam_operasional}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════ STEP 3 – Kontak & Foto ════════════════════ */}
          {step === 3 && (
            <div className="space-y-5">
              {/* WhatsApp */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Nomor WhatsApp{" "}
                  <span
                    className="font-normal text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    (opsional)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">
                    📱
                  </span>
                  <input
                    type="text"
                    name="wa_number"
                    value={formState.wa_number}
                    onChange={handleInputChange}
                    placeholder="081234567890"
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none"
                    style={inputStyle()}
                  />
                </div>
              </div>

              {/* Location Note */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Catatan Lokasi{" "}
                  <span
                    className="font-normal text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    (opsional)
                  </span>
                </label>
                <textarea
                  name="location_note"
                  value={formState.location_note}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Contoh: Area Sukabirus, atau 'Dapat diantar ke seluruh Bandung'"
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle()}
                />
              </div>

              {/* Primary Image Upload */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Gambar Utama <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  ref={primaryImageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePrimaryImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => primaryImageInputRef.current?.click()}
                  className="w-full rounded-2xl px-4 py-5 text-center transition-all active:scale-[0.98]"
                  style={dashedAreaStyle(
                    !!errors.primary_image,
                    !!primaryImageFile,
                  )}
                >
                  {primaryImageFile && primaryImagePreview ? (
                    <div className="flex items-center gap-3">
                      <Image
                        src={primaryImagePreview}
                        alt="Preview"
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        style={{
                          border: "2px solid var(--color-primary)",
                        }}
                        unoptimized
                      />
                      <div className="min-w-0 text-left">
                        <p
                          className="truncate text-sm font-semibold"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {primaryImageFile.name}
                        </p>
                        <p
                          className="mt-0.5 text-xs"
                          style={{ color: "var(--color-body-muted)" }}
                        >
                          Ketuk untuk ganti
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-4xl">📷</div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-body)" }}
                      >
                        Ketuk untuk upload gambar utama
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--color-body-muted)" }}
                      >
                        JPG, PNG, WebP · maks. 5MB
                      </p>
                    </>
                  )}
                </button>
                {errors.primary_image && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.primary_image}
                  </p>
                )}
              </div>

              {/* Additional Images */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Gambar Tambahan{" "}
                  <span
                    className="font-normal text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    (opsional, maks. 5)
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleAdditionalImagesUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={additionalFiles.length >= 5}
                  className="w-full rounded-2xl px-4 py-4 text-center transition-all disabled:opacity-50 active:scale-[0.98]"
                  style={{
                    border: "2px dashed var(--color-input-border)",
                    background: "var(--color-surface-alt)",
                    cursor:
                      additionalFiles.length >= 5 ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="mb-1 text-2xl">➕</div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-body)" }}
                  >
                    Tambah gambar lainnya
                  </p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    {additionalFiles.length}/5 gambar
                  </p>
                </button>
                {errors.image && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.image}
                  </p>
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 0 && (
                <div>
                  <p
                    className="mb-2 text-xs font-medium"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    Pratinjau ({allImages.length}{" "}
                    {allImages.length === 1 ? "gambar" : "gambar"})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImages.map((img) => (
                      <div key={img.id} className="relative shrink-0">
                        <Image
                          src={img.url}
                          alt={img.name}
                          className="h-20 w-20 rounded-xl object-cover"
                          style={{
                            border: img.isPrimary
                              ? "2px solid var(--color-primary)"
                              : "2px solid var(--color-input-border)",
                          }}
                          unoptimized
                        />
                        {img.isPrimary && (
                          <span
                            className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                            style={{ background: "var(--color-primary)" }}
                          >
                            Utama
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteImage(img.id, img.isPrimary)
                          }
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow-sm"
                          style={{ background: "#ef4444" }}
                          aria-label="Hapus gambar"
                        >
                          <TrashIcon className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability status */}
              <div
                className="rounded-2xl p-4"
                style={{
                  border: "1.5px solid var(--color-input-border)",
                  background: "var(--color-surface-alt)",
                }}
              >
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Status Tersedia
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: true, label: "✓ Tersedia" },
                    { value: false, label: "✗ Tidak Tersedia" },
                  ].map((option) => {
                    const isSelected = formState.is_available === option.value;
                    return (
                      <button
                        key={option.value.toString()}
                        type="button"
                        onClick={() => handleStatusChange(option.value)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
                        style={{
                          border: isSelected
                            ? "1.5px solid var(--color-primary)"
                            : "1.5px solid var(--color-input-border)",
                          background: isSelected
                            ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))"
                            : "var(--color-surface)",
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: isSelected
                              ? "var(--color-primary)"
                              : "var(--color-input-border)",
                            background: isSelected
                              ? "var(--color-primary)"
                              : "transparent",
                          }}
                        >
                          {isSelected && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit error */}
              {errors.submit && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background:
                      "color-mix(in srgb, #ef4444 10%, var(--color-surface))",
                    border:
                      "1px solid color-mix(in srgb, #ef4444 25%, var(--color-surface))",
                  }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#ef4444" }}
                  >
                    {errors.submit}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky footer ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 pb-6 pt-3"
          style={{ borderTop: "1px solid var(--color-input-border)" }}
        >
          <div className="flex gap-3">
            {/* Sebelumnya (step > 1) */}
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  border: "1.5px solid var(--color-input-border)",
                  background: "var(--color-surface-alt)",
                  color: "var(--color-body)",
                }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Sebelumnya
              </button>
            )}

            {/* Lanjut / Buat Layanan */}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.97]"
                style={{
                  background: "var(--color-primary)",
                  boxShadow:
                    "0 2px 12px 0 color-mix(in srgb, var(--color-primary) 35%, transparent)",
                }}
              >
                Lanjut
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-60 active:scale-[0.97]"
                style={{
                  background: "var(--color-primary)",
                  boxShadow:
                    "0 2px 12px 0 color-mix(in srgb, var(--color-primary) 35%, transparent)",
                }}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Membuat...
                  </>
                ) : (
                  "Buat Layanan"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
