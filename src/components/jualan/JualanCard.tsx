"use client";

import Image from "next/image";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import { memo } from "react";

interface JualanGoodsWithMedia {
  id: string;
  name: string;
  summary: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  wa_number: string | null;
  owner_display_name: string;
  owner_blok_rumah: string | null;
  owner_avatar_url: string | null;
  category_name: string;
  category_icon: string | null;
  primary_image_url: string | null;
  media_count: number;
}

interface JualanCardProps {
  goods: JualanGoodsWithMedia;
  onClick?: () => void;
}

export function JualanCardSkeleton() {
  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-app-surface shadow-sm"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      {/* Square image skeleton */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-app-surface-alt">
        <div className="h-full w-full animate-pulse bg-app-surface-alt" />
      </div>

      {/* Info skeleton */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-app-surface-alt" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-app-surface-alt" />
        <div className="mt-1 h-5 w-2/3 animate-pulse rounded bg-app-surface-alt" />
        <div className="mt-1 flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="h-3 w-24 animate-pulse rounded bg-app-surface-alt" />
        </div>
      </div>
    </div>
  );
}

export const JualanCard = memo(function JualanCard({
  goods,
  onClick,
}: JualanCardProps) {
  const hasDiscount = goods.discount_percent > 0;
  const isSoldOut = goods.stock_qty <= 0;

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
      aria-label={`${goods.name} – ${formatRupiah(goods.final_price)}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-app-surface shadow-sm transition-all active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
      style={{ border: "1px solid var(--color-input-border)" }}
    >
      {/* ── Image ── */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-app-surface-alt">
        {goods.primary_image_url ? (
          <Image
            src={goods.primary_image_url}
            alt={goods.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 200px"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)))",
            }}
          >
            <span className="text-4xl leading-none">
              {goods.category_icon || "📦"}
            </span>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute left-2.5 top-2.5 rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
            −{goods.discount_percent}%
          </div>
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-12 pb-3">
            <p className="text-center text-sm font-bold text-white">
              Stok Habis
            </p>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden p-3">
        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-app-title">
          {goods.name}
        </h3>

        {/* Summary */}
        {goods.summary && (
          <p className="line-clamp-1 text-xs leading-relaxed text-app-body-muted">
            {goods.summary}
          </p>
        )}

        {/* Price */}
        <div className="mt-0.5">
          <p className="text-base font-extrabold leading-tight text-app-primary">
            {formatRupiah(goods.final_price)}
          </p>
          <div className="flex items-center gap-1.5">
            {hasDiscount && (
              <span className="text-[11px] text-app-body-muted line-through">
                {formatRupiah(goods.base_price)}
              </span>
            )}
            <span className="text-[11px] font-medium text-app-body-muted">
              / {goods.unit_label}
            </span>
          </div>
        </div>

        {/* Seller */}
        <div className="mt-0.5 flex items-start gap-2">
          {goods.owner_avatar_url ? (
            <div className="relative mt-0.5 h-5 w-5 shrink-0 overflow-hidden rounded-full">
              <Image
                src={goods.owner_avatar_url}
                alt={goods.owner_display_name}
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
          ) : (
            <div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {goods.owner_display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-app-body">
              {goods.owner_display_name}
            </p>
            {goods.owner_blok_rumah && (
              <p className="text-[11px] text-app-body-muted">
                {goods.owner_blok_rumah}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
