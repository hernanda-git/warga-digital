"use client";

import Image from "next/image";
import {
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import type { JasaServiceWithMedia } from "@/types/database";

interface JasaCardProps {
  service: JasaServiceWithMedia;
  onClick?: () => void;
  onContact?: () => void;
}

// ── Day helpers ────────────────────────────────────────────────────────────

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

const DAY_SHORT: Record<string, string> = {
  senin: "Sen",
  selasa: "Sel",
  rabu: "Rab",
  kamis: "Kam",
  jumat: "Jum",
  sabtu: "Sab",
  minggu: "Min",
  tanggal_merah: "Tgl. Merah",
};

function summariseDays(hari: Record<string, boolean>): string {
  const active = DAY_ORDER.filter((d) => hari[d]);
  if (active.length === 0) return "—";
  if (active.length >= 7) return "Setiap hari";

  const weekdays = ["senin", "selasa", "rabu", "kamis", "jumat"];
  const weekend = ["sabtu", "minggu"];
  const hasAllWeekdays = weekdays.every((d) => hari[d]);
  const hasWeekend = weekend.every((d) => hari[d]);

  if (hasAllWeekdays && hasWeekend) return "Setiap hari";
  if (hasAllWeekdays && !hari.sabtu && !hari.minggu) return "Senin – Jumat";
  if (hasAllWeekdays && hari.sabtu && !hari.minggu) return "Senin – Sabtu";

  if (active.length <= 3) return active.map((d) => DAY_SHORT[d]).join(", ");

  return `${DAY_SHORT[active[0]]} – ${DAY_SHORT[active[active.length - 1]]}`;
}

function formatTime(t: string) {
  return t?.substring(0, 5) ?? "--:--";
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function JasaCardSkeleton() {
  return (
    <div
      className="flex gap-3 overflow-hidden rounded-2xl bg-app-surface p-3"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      {/* Image placeholder */}
      <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-app-surface-alt" />

      {/* Text placeholders */}
      <div className="flex flex-1 flex-col justify-between gap-2 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-app-surface-alt" />
        </div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-app-surface-alt" />
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

export function JasaCard({ service, onClick }: JasaCardProps) {
  const isAvailable = service.is_available;

  const daysText = summariseDays(service.hari_operasional);
  const timeText = `${formatTime(service.jam_operasional_mulai)} – ${formatTime(service.jam_operasional_selesai)}`;
  const hasRating = service.rating_count > 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${service.name} – ${formatRupiah(service.estimated_price)}`}
      className="group flex cursor-pointer gap-3 overflow-hidden rounded-2xl bg-app-surface p-3 shadow-sm transition-all active:scale-[0.985]"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      {/* ── Left: image ───────────────────────────────────────────────── */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-app-surface-alt">
        {service.primary_image_url ? (
          <Image
            src={service.primary_image_url}
            alt={service.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="96px"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)))",
            }}
          >
            <span className="text-3xl leading-none">
              {service.category_icon || "🔧"}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: content ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Row 1: category + availability pill */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[11px] font-medium"
            style={{ color: "var(--color-body-muted)" }}
          >
            {service.category_icon ? `${service.category_icon} ` : ""}
            {service.category_name}
          </span>

          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={
              isAvailable
                ? {
                    background: "color-mix(in srgb, #22c55e 12%, transparent)",
                    color: "#16a34a",
                  }
                : {
                    background: "var(--color-surface-alt)",
                    color: "var(--color-body-muted)",
                  }
            }
          >
            {isAvailable ? (
              <CheckCircleIcon className="h-3 w-3" />
            ) : (
              <XCircleIcon className="h-3 w-3" />
            )}
            {isAvailable ? "Tersedia" : "Tidak Tersedia"}
          </span>
        </div>

        {/* Row 2: service name */}
        <h3
          className="line-clamp-2 text-sm font-bold leading-snug"
          style={{ color: "var(--color-title)" }}
        >
          {service.name}
        </h3>

        {/* Row 3: price */}
        <p
          className="text-sm font-extrabold leading-none"
          style={{ color: "var(--color-primary)" }}
        >
          {formatRupiah(service.estimated_price)}
        </p>

        {/* Row 4: operating hours + days */}
        <div
          className="flex items-center gap-1 text-[11px]"
          style={{ color: "var(--color-body-muted)" }}
        >
          <ClockIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {timeText}
            <span className="mx-1 opacity-40">·</span>
            {daysText}
          </span>
        </div>

        {/* Row 5: location note OR rating — show one if present */}
        {service.location_note ? (
          <div
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--color-body-muted)" }}
          >
            <MapPinIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{service.location_note}</span>
          </div>
        ) : hasRating ? (
          <div className="flex items-center gap-1">
            <StarSolidIcon className="h-3 w-3 text-yellow-400" />
            <span
              className="text-[11px] font-semibold"
              style={{ color: "var(--color-body)" }}
            >
              {service.rating_avg.toFixed(1)}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-body-muted)" }}
            >
              ({service.rating_count})
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
