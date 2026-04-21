"use client";

import Image from "next/image";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import type { JasaServiceWithMedia } from "@/types/database";
import { memo } from "react";

interface JasaCardProps {
  service: JasaServiceWithMedia;
  onClick?: () => void;
  onContact?: () => void;
}

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

export function JasaCardSkeleton() {
  return (
    <div
      className="flex h-40 overflow-hidden rounded-2xl bg-app-surface"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      <div className="h-full w-[140px] shrink-0 animate-pulse bg-app-surface-alt" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden px-3 py-2.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3.5 w-full animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3.5 w-5/6 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-app-surface-alt" />
      </div>
    </div>
  );
}

export const JasaCard = memo(function JasaCard({ service, onClick }: JasaCardProps) {
  const daysText = summariseDays(service.hari_operasional);

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
      className="group flex h-40 cursor-pointer overflow-hidden rounded-2xl bg-app-surface shadow-sm transition-all active:scale-[0.985]"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      <div className="relative h-full w-[140px] shrink-0 overflow-hidden bg-app-surface-alt">
        {service.primary_image_url ? (
          <Image
            src={service.primary_image_url}
            alt={service.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="140px"
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

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden px-3 py-2.5">
        <h3
          className="line-clamp-2 text-base font-bold leading-snug"
          style={{ color: "var(--color-title)" }}
        >
          {service.name}
        </h3>

        {service.description && (
          <p
            className="line-clamp-2 text-[13px] leading-relaxed"
            style={{ color: "var(--color-body-muted)" }}
          >
            {service.description}
          </p>
        )}

        <p
          className="truncate text-[13px] font-semibold"
          style={{ color: "var(--color-body)" }}
        >
          {service.owner_display_name}
          {service.owner_blok_rumah && ` - ${service.owner_blok_rumah}`}
        </p>

        <p
          className="text-[15px] font-extrabold"
          style={{ color: "var(--color-primary)" }}
        >
          {formatRupiah(service.estimated_price)}
        </p>

        <p
          className="text-[12px]"
          style={{ color: "var(--color-body-muted)" }}
        >
          {daysText}
        </p>
      </div>
    </article>
  );
});
