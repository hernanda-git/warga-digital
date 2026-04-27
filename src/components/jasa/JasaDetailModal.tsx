"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  PencilIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { ImageGallery } from "./ImageGallery";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import type { JasaServiceDetailWithMedia } from "@/types/database";

interface JasaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: (id: string) => Promise<void>;
  service: JasaServiceDetailWithMedia | null;
  isLoading?: boolean;
}

const DAY_LABELS: Record<string, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
  tanggal_merah: "Tgl Merah",
};

const DAY_ORDER = [
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
  "minggu",
  "tanggal_merah",
];

function formatTime(time: string): string {
  return time?.substring(0, 5) ?? "--:--";
}

export function JasaDetailModal({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  service,
  isLoading = false,
}: JasaDetailModalProps) {
  const [closing, setClosing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = !!(
    currentUser &&
    service &&
    currentUser.id === service.owner_user_id
  );

  // Lock body scroll when open
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

  const handleClose = () => {
    setConfirmDelete(false);
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 260);
  };

  if (!isOpen && !closing) return null;
  if (!service && !isLoading) return null;

  const isAvailable = service ? service.is_available : false;

  const operatingDays = service
    ? DAY_ORDER.filter((d) => service.hari_operasional[d] === true)
    : [];

  const handleWhatsAppContact = () => {
    if (!service?.wa_number) return;
    const rawNumber = service.wa_number;
    const stripped = rawNumber.replace(/[^0-9]/g, "");
    const normalized = stripped.replace(/^0/, "62");
    const message = encodeURIComponent(
      `Halo, saya tertarik dengan layanan "${service.name}". Apakah masih tersedia?`,
    );
    const url = `https://wa.me/${normalized}?text=${message}`;
    console.log("[JasaDetailModal] handleWhatsAppContact", {
      rawWaNumber: rawNumber,
      stripped,
      normalized,
      finalUrl: url,
    });
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Backdrop */}
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

      {/* Sheet panel */}
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

        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-3"
          style={{
            borderBottom: "1px solid var(--color-input-border)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{service?.category_icon || "🔧"}</span>
            <div>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--color-body-muted)" }}
              >
                {service?.category_name}
              </p>
              <h2
                className="text-base font-bold leading-tight"
                style={{ color: "var(--color-title)" }}
              >
                Detail Layanan
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{ background: "var(--color-surface-alt)" }}
            aria-label="Tutup"
          >
            <XMarkIcon
              className="h-5 w-5"
              style={{ color: "var(--color-body-muted)" }}
            />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading || !service ? (
            /* Loading skeleton */
            <div className="space-y-4 p-5">
              {[100, 60, 80, 70].map((w, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl"
                  style={{
                    height: i === 0 ? 200 : 40,
                    width: `${w}%`,
                    background: "var(--color-surface-alt)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5 p-5 pb-2">
              {/* ── Image Gallery ──────────────────────────────────── */}
              {service.media && service.media.length > 0 && (
                <ImageGallery images={service.media} />
              )}

              {/* ── Hero info card ────────────────────────────────── */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))",
                  border:
                    "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)",
                }}
              >
                {/* Name + availability */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h1
                    className="text-xl font-bold leading-snug"
                    style={{ color: "var(--color-title)" }}
                  >
                    {service.name}
                  </h1>

                  {/* Availability pill */}
                  <span
                    className="mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                    style={
                      isAvailable
                        ? { background: "#dcfce7", color: "#15803d" }
                        : { background: "#f3f4f6", color: "#6b7280" }
                    }
                  >
                    {isAvailable ? (
                      <span className="flex items-center gap-1">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Tersedia
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        Tidak Tersedia
                      </span>
                    )}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {formatRupiah(service.estimated_price)}
                  </span>
                </div>
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--color-body-muted)" }}
                >
                  Estimasi harga layanan
                </p>
              </div>

              {/* ── Description ───────────────────────────────────── */}
              {service.description && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-input-border)",
                  }}
                >
                  <h3
                    className="mb-2 flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--color-title)" }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                        color: "var(--color-primary)",
                      }}
                    >
                      📝
                    </span>
                    Deskripsi
                  </h3>
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ color: "var(--color-body)" }}
                  >
                    {service.description}
                  </p>
                </div>
              )}

              {/* ── Operating Schedule ────────────────────────────── */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--color-surface-alt)",
                  border: "1px solid var(--color-input-border)",
                }}
              >
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  <CalendarDaysIcon
                    className="h-4 w-4"
                    style={{ color: "var(--color-primary)" }}
                  />
                  Jadwal Operasional
                </h3>

                {/* Days grid */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {DAY_ORDER.map((day) => {
                    const active = service.hari_operasional[day] === true;
                    return (
                      <span
                        key={day}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={
                          active
                            ? {
                                background:
                                  "color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))",
                                border:
                                  "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                                color: "var(--color-primary)",
                              }
                            : {
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-input-border)",
                                color: "var(--color-body-muted)",
                                opacity: 0.5,
                              }
                        }
                      >
                        {DAY_LABELS[day] ?? day}
                      </span>
                    );
                  })}
                </div>

                {/* Time range */}
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--color-body)" }}
                >
                  <ClockIcon
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <span className="font-medium">
                    {formatTime(service.jam_operasional_mulai)}
                    {" – "}
                    {formatTime(service.jam_operasional_selesai)}
                  </span>
                </div>
              </div>

              {/* ── Contact & Location ────────────────────────────── */}
              <div className="grid grid-cols-1 gap-3">
                {/* WhatsApp contact */}
                {service.wa_number && (
                  <div
                    className="flex items-center gap-3 rounded-2xl p-4"
                    style={{
                      background: "var(--color-surface-alt)",
                      border: "1px solid var(--color-input-border)",
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
                      }}
                    >
                      <PhoneIcon
                        className="h-5 w-5"
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--color-body-muted)" }}
                      >
                        Kontak WhatsApp
                      </p>
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--color-body)" }}
                      >
                        {service.wa_number}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {service.location_note && (
                  <div
                    className="flex items-center gap-3 rounded-2xl p-4"
                    style={{
                      background: "var(--color-surface-alt)",
                      border: "1px solid var(--color-input-border)",
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
                      }}
                    >
                      <MapPinIcon
                        className="h-5 w-5"
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--color-body-muted)" }}
                      >
                        Lokasi
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--color-body)" }}
                      >
                        {service.location_note}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Provider info ─────────────────────────────────── */}
              <div
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{
                  background: "var(--color-surface-alt)",
                  border: "1px solid var(--color-input-border)",
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
                  }}
                >
                  <UserIcon
                    className="h-5 w-5"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--color-body-muted)" }}
                  >
                    Penyedia Layanan
                  </p>
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--color-body)" }}
                  >
                    {service.owner_display_name}
                  </p>
                </div>
              </div>

              {/* spacer before fixed footer */}
              <div className="h-2" />
            </div>
          )}
        </div>

        {/* ── Sticky footer actions ──────────────────────────────── */}
        {!isLoading && service && (
          <div
            className="shrink-0 px-5 pb-6 pt-3"
            style={{ borderTop: "1px solid var(--color-input-border)" }}
          >
            {confirmDelete ? (
              /* ── Delete confirmation card ── */
              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    "color-mix(in srgb, #ef4444 8%, var(--color-surface))",
                  border:
                    "1.5px solid color-mix(in srgb, #ef4444 30%, transparent)",
                }}
              >
                <p
                  className="mb-3 text-center text-sm font-semibold"
                  style={{ color: "#ef4444" }}
                >
                  Hapus layanan ini secara permanen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: "var(--color-surface-alt)",
                      border: "1.5px solid var(--color-input-border)",
                      color: "var(--color-body)",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      if (onDelete) {
                        await onDelete(service.id);
                      }
                      onClose();
                    }}
                    className="flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: "#ef4444" }}
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            ) : (
              /* ── Normal footer ── */
              <div className="flex gap-3">
                {/* Delete button – owner only */}
                {isOwner && onDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex shrink-0 items-center justify-center gap-1 rounded-2xl px-3 py-3.5 text-sm font-semibold transition-all active:scale-95"
                    style={{
                      border:
                        "1.5px solid color-mix(in srgb, #ef4444 40%, transparent)",
                      background:
                        "color-mix(in srgb, #ef4444 8%, var(--color-surface))",
                      color: "#ef4444",
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Hapus</span>
                  </button>
                )}

                {/* Edit button – owner only */}
                {isOwner && onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all active:scale-95"
                  style={{
                    border:
                      "1.5px solid color-mix(in srgb, var(--color-primary) 35%, transparent)",
                    background:
                      "color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))",
                    color: "var(--color-primary)",
                  }}
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                )}

                {/* WhatsApp CTA */}
                {service.wa_number ? (
                  <button
                    onClick={handleWhatsAppContact}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                    style={{
                      background: "var(--color-primary)",
                      boxShadow: "0 6px 20px -6px var(--color-primary-shadow)",
                    }}
                  >
                    <span>💬</span>
                    <span>Hubungi via WhatsApp</span>
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="flex flex-1 items-center justify-center rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: "var(--color-surface-alt)",
                      border: "1.5px solid var(--color-input-border)",
                      color: "var(--color-body)",
                    }}
                  >
                    Tutup
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline keyframes for fadeOut/slideDown (slideUp/fadeIn are in globals.css) */}
      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideDown {
          from { transform: translate(-50%, 0); }
          to { transform: translate(-50%, 100%); }
        }
      `}</style>
    </>
  );
}
