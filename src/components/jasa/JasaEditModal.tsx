"use client";

import { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { DaySelector } from "./DaySelector";
import { TimeRangePicker } from "./TimeRangePicker";
import type { JasaServiceDetailWithMedia } from "@/types/database";

interface EditJasaData {
  name: string;
  description: string;
  estimated_price: number;
  category_id: string;
  hari_operasional: Record<string, boolean>;
  jam_operasional_mulai: string;
  jam_operasional_selesai: string;
  is_available: boolean;
  wa_number: string | null;
  location_note: string | null;
}

interface JasaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditJasaData) => Promise<void>;
  service: JasaServiceDetailWithMedia | null;
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

export function JasaEditModal({
  isOpen,
  onClose,
  onSubmit,
  service,
  categories,
  isLoading = false,
}: JasaEditModalProps) {
  const [step, setStep] = useState(1);
  const [closing, setClosing] = useState(false);

  const [formState, setFormState] = useState({
    name: "",
    description: "",
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
  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      id: string;
      url: string;
      alt_text: string | null;
      sort_order: number;
      is_primary: boolean;
    }>
  >([]);
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Initialize form with service data ────────────────────────────────────
  useEffect(() => {
    if (isOpen && service) {
      setStep(1);
      setFormState({
        name: service.name,
        description: service.description || "",
        estimated_price: service.estimated_price.toString(),
        category_id: service.category_id,
        hari_operasional: service.hari_operasional,
        jam_operasional_mulai: service.jam_operasional_mulai,
        jam_operasional_selesai: service.jam_operasional_selesai,
        is_available: service.is_available,
        wa_number: service.wa_number || "",
        location_note: service.location_note || "",
      });
      setUploadedImages(service.media);
      setAdditionalFiles([]);
      setErrors({});
    }
  }, [isOpen, service]);

  // ── Handle close with animation ───────────────────────────────────────────
  const handleClose = () => {
    if (isLoading) return;
    setClosing(true);
    setTimeout(onClose, 260); // Match animation duration
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDayChange = (days: Record<string, boolean>) => {
    setFormState((prev) => ({ ...prev, hari_operasional: days }));
  };

  const handleTimeChange = (start: string, end: string) => {
    setFormState((prev) => ({
      ...prev,
      jam_operasional_mulai: start,
      jam_operasional_selesai: end,
    }));
    if (errors.jam_operasional) {
      setErrors((prev) => ({ ...prev, jam_operasional: "" }));
    }
  };

  // ── Image upload for new files ────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 5 - additionalFiles.length);
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

  // ── Delete existing image ─────────────────────────────────────────────────
  const handleDeleteExistingImage = async (
    id: string,
    url: string,
    isPrimary: boolean,
  ) => {
    if (!service) return;
    try {
      const response = await fetch(`/api/jasa/${service.id}/media/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal hapus gambar");

      setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        image: error.message || "Gagal hapus gambar",
      }));
    }
  };

  // ── Delete new file ───────────────────────────────────────────────────────
  const handleDeleteNewImage = (id: string) => {
    setAdditionalFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
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

    // Step 3 has no mandatory fields for edit

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
      const data = {
        name: formState.name,
        description: formState.description,
        estimated_price: parseFloat(formState.estimated_price),
        category_id: formState.category_id,
        hari_operasional: formState.hari_operasional,
        jam_operasional_mulai: formState.jam_operasional_mulai,
        jam_operasional_selesai: formState.jam_operasional_selesai,
        is_available: formState.is_available,
        wa_number: formState.wa_number || null,
        location_note: formState.location_note || null,
      };

      await onSubmit(data);
      handleClose();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal update layanan";
      setErrors((prev) => ({ ...prev, submit: msg }));
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isOpen && !closing) return null;

  const stepInfo = STEPS[step - 1];
  const progressPct = (step / 3) * 100;

  const allNewImages = additionalFiles.map((f) => ({
    id: f.id,
    url: f.preview,
    name: f.file.name,
    isPrimary: false,
  }));

  // ── Shared styles ─────────────────────────────────────────────────────────
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
        @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp  { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
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

              {/* Kategori – pill grid */}
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
                            ? "color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))"
                            : "var(--color-surface)",
                          color: "var(--color-body)",
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    Rp
                  </span>
                  <input
                    type="number"
                    name="estimated_price"
                    value={formState.estimated_price}
                    onChange={handleInputChange}
                    placeholder="0"
                    min={0}
                    className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none"
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
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Jelaskan layanan yang Anda tawarkan..."
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                  style={inputStyle()}
                />
              </div>
            </div>
          )}

          {/* ════════════════════ STEP 2 – Jadwal ════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3
                  className="mb-3 text-lg font-bold"
                  style={{ color: "var(--color-title)" }}
                >
                  Hari Operasional
                </h3>
                <DaySelector
                  value={formState.hari_operasional}
                  onChange={handleDayChange}
                />
                {errors.hari_operasional && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.hari_operasional}
                  </p>
                )}
              </div>

              <div>
                <h3
                  className="mb-3 text-lg font-bold"
                  style={{ color: "var(--color-title)" }}
                >
                  Jam Operasional
                </h3>
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
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.jam_operasional}
                  </p>
                )}
              </div>

              {/* Ketersediaan */}
              <div>
                <h3
                  className="mb-3 text-lg font-bold"
                  style={{ color: "var(--color-title)" }}
                >
                  Ketersediaan
                </h3>

                <div className="flex gap-2">
                  {[
                    { value: true, label: "✓ Tersedia" },

                    { value: false, label: "✗ Tidak Tersedia" },
                  ].map((option) => (
                    <button
                      key={option.value.toString()}
                      onClick={() => {
                        setFormState((p) => ({
                          ...p,

                          is_available: option.value,
                        }));
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                      style={{
                        background:
                          formState.is_available === option.value
                            ? "var(--color-primary)"
                            : "var(--color-surface-alt)",

                        color:
                          formState.is_available === option.value
                            ? "white"
                            : "var(--color-body)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  name="wa_number"
                  value={formState.wa_number}
                  onChange={handleInputChange}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle()}
                />
              </div>

              {/* Lokasi */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Lokasi (opsional)
                </label>
                <input
                  type="text"
                  name="location_note"
                  value={formState.location_note}
                  onChange={handleInputChange}
                  placeholder="Contoh: Blok A, Dekat Masjid, dll"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={inputStyle()}
                />
              </div>

              {/* Images */}
              {(uploadedImages.length > 0 || allNewImages.length > 0) && (
                <div>
                  <label
                    className="mb-2 block text-sm font-semibold"
                    style={{ color: "var(--color-title)" }}
                  >
                    Gambar Layanan
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {/* Existing Images */}
                    {uploadedImages.map((img) => (
                      <div
                        key={`existing-${img.id}`}
                        className="relative group"
                      >
                        <div
                          className="aspect-square overflow-hidden rounded-lg"
                          style={{
                            border: "1px solid var(--color-input-border)",
                          }}
                        >
                          <Image
                            src={img.url}
                            alt={img.alt_text || "Gambar layanan"}
                            fill
                            className="object-cover"
                            sizes="128px"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteExistingImage(
                              img.id,
                              img.url,
                              img.is_primary,
                            )
                          }
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus gambar"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                        {img.is_primary && (
                          <div
                            className="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ background: "var(--color-primary)" }}
                          >
                            Utama
                          </div>
                        )}
                      </div>
                    ))}
                    {/* New Images */}
                    {allNewImages.map((img) => (
                      <div key={`new-${img.id}`} className="relative group">
                        <div
                          className="aspect-square overflow-hidden rounded-lg"
                          style={{
                            border: "1px solid var(--color-input-border)",
                          }}
                        >
                          <Image
                            src={img.url}
                            alt={img.name}
                            fill
                            className="object-cover"
                            sizes="128px"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNewImage(img.id)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus gambar"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New */}
              <div>
                <label
                  className="mb-2 block text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Tambah Gambar Baru
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl p-6 text-center transition-all active:scale-[0.98]"
                  style={dashedAreaStyle(
                    !!errors.image,
                    allNewImages.length > 0,
                  )}
                >
                  <div className="mb-2">
                    <svg
                      className="mx-auto h-12 w-12"
                      style={{ color: "var(--color-body-muted)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-body)" }}
                  >
                    Tambah gambar baru
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    JPEG, PNG, WebP (maks 5 total tambahan)
                  </p>
                </button>
                {errors.image && (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                    {errors.image}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div
              className="mt-4 rounded-xl p-3 text-sm"
              style={{
                background:
                  "color-mix(in srgb, #ef4444 10%, var(--color-surface))",
                color: "#ef4444",
              }}
            >
              {errors.submit}
            </div>
          )}
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 py-4"
          style={{
            borderTop: "1px solid var(--color-input-border)",
            background: "var(--color-surface)",
          }}
        >
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ background: "var(--color-primary)" }}
            >
              Lanjutkan
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--color-primary)" }}
            >
              {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
