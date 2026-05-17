"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type {
  AssetItem,
  AssetCategory,
  AssetStats,
  AssetFilterState,
} from "@/types/asset-rt";
import { useAuthStore } from "@/stores/auth-store";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ArrowsUpDownIcon,
  UserIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";

interface AssetRtPageClientProps {
  initialAssets: AssetItem[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategories: AssetCategory[];
  initialStats: AssetStats | null;
  initialFilterState: AssetFilterState;
}

const THEME_COLORS = [
  { bg: "bg-[#EBF3FD]", text: "text-[#1556A8]" },
  { bg: "bg-[#FDF0DC]", text: "text-[#7A4A0A]" },
  { bg: "bg-[#EFEDFE]", text: "text-[#3C3489]" },
  { bg: "bg-[#F0EFEA]", text: "text-[#777]" },
  { bg: "bg-[#E8F5E2]", text: "text-[#2D6B14]" },
  { bg: "bg-[#FCE4EC]", text: "text-[#8B1A3A]" },
] as const;

function getCategoryColor(categoryName: string): (typeof THEME_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THEME_COLORS[Math.abs(hash) % THEME_COLORS.length];
}

function getUsageLabel(isUsed: boolean | null): string {
  if (isUsed === true) return "Digunakan";
  if (isUsed === false) return "Tidak Digunakan";
  return "Tidak Terpakai";
}

function getUsageColor(isUsed: boolean | null): string {
  if (isUsed === true) return "bg-[#E8F5E2] text-[#2D6B14]";
  if (isUsed === false) return "bg-[#FDF0DC] text-[#7A4A0A]";
  return "bg-[#F0EFEA] text-[#777]";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hari ini";
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
    return `${Math.floor(diffDays / 365)} tahun lalu`;
  } catch {
    return "";
  }
}

export default function AssetRtPageClient({
  initialAssets,
  initialTotal,
  initialTotalPages: _initialTotalPages,
  initialCategories,
  initialStats,
  initialFilterState,
}: AssetRtPageClientProps) {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState<AssetStats | null>(initialStats);
  const [categories] = useState<AssetCategory[]>(initialCategories);
  const [filterState, setFilterState] =
    useState<AssetFilterState>(initialFilterState);

  const [searchText, setSearchText] = useState(initialFilterState.search ?? "");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const displayStats = stats ?? {
    total: 0,
    new_this_month: 0,
    in_use: 0,
    not_in_use: 0,
  };

  const fetchData = useCallback(async (filters: AssetFilterState) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.categoryFilter && filters.categoryFilter !== "all")
        params.set("category", filters.categoryFilter);
      if (filters.sortBy && filters.sortBy !== "newest")
        params.set("sort", filters.sortBy);
      params.set("limit", "50");

      const [assetsRes, statsRes] = await Promise.all([
        apiFetch(`/api/asset-rt?${params.toString()}`),
        apiFetch("/api/asset-rt/stats"),
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        if (data.success) {
          setAssets(data.data.assets);
          setTotal(data.data.total);
        }
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (err) {
      console.error("[asset-rt] fetchData error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const newFilter = { ...filterState, search: value };
      setFilterState(newFilter);
      fetchData(newFilter);
    }, 350);
  };

  const handleCategoryFilter = (categoryId: string) => {
    const newFilter = { ...filterState, categoryFilter: categoryId };
    setFilterState(newFilter);
    fetchData(newFilter);
  };

  const handleSortToggle = () => {
    const newSort =
      filterState.sortBy === "newest"
        ? "oldest"
        : filterState.sortBy === "oldest"
          ? "name_asc"
          : "newest";
    const newFilter = {
      ...filterState,
      sortBy: newSort as AssetFilterState["sortBy"],
    };
    setFilterState(newFilter);
    fetchData(newFilter);
  };

  const sortLabel =
    filterState.sortBy === "newest"
      ? "Terbaru"
      : filterState.sortBy === "oldest"
        ? "Terlama"
        : "A-Z";

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

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
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Inventaris
                </p>
                <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                  Daftar Aset
                </h1>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/asset-rt/new")}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Tambah
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Total aset
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {displayStats.total}
                </p>
              </div>
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Baru bulan ini
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {displayStats.new_this_month}
                </p>
              </div>
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Digunakan
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {displayStats.in_use}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
          <section className="px-4 pt-4 lg:px-0">
            <div
              className="flex h-11 items-center gap-2.5 rounded-2xl bg-app-surface px-4"
              style={{ border: "1.5px solid var(--color-input-border)" }}
            >
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari nama, lokasi, atau tag…"
                className="h-full flex-1 border-none bg-transparent text-sm text-app-title outline-none placeholder:text-app-body-muted/50"
              />
              <button
                type="button"
                onClick={() => {
                  handleSearchChange("");
                  setSearchText("");
                }}
                className="flex items-center justify-center"
                aria-label="Reset pencarian"
              >
                {searchText ? (
                  <XMarkIcon className="h-4 w-4 text-app-body-muted" />
                ) : (
                  <AdjustmentsHorizontalIcon className="h-4 w-4 text-app-body-muted" />
                )}
              </button>
            </div>
          </section>

          <section className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 pt-3 pb-1 lg:px-0">
            <button
              type="button"
              onClick={() => handleCategoryFilter("all")}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95"
              style={
                filterState.categoryFilter === "all" ||
                !filterState.categoryFilter
                  ? {
                      background: "var(--color-primary)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--color-surface)",
                      border: "1.5px solid var(--color-input-border)",
                      color: "var(--color-body-muted)",
                    }
              }
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryFilter(cat.id)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95"
                style={
                  filterState.categoryFilter === cat.id
                    ? {
                        background: "var(--color-primary)",
                        color: "#fff",
                      }
                    : {
                        background: "var(--color-surface)",
                        border: "1.5px solid var(--color-input-border)",
                        color: "var(--color-body-muted)",
                      }
                }
              >
                {cat.name}
              </button>
            ))}
          </section>

          <section className="px-4 pb-6 pt-4 lg:px-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                {total} aset
              </span>
              <button
                type="button"
                onClick={handleSortToggle}
                className="flex items-center gap-1 border-none bg-transparent text-xs font-semibold text-app-body-muted transition-colors"
                style={{ color: "var(--color-primary)" }}
              >
                <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                {sortLabel}
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-[3px] border-transparent"
                  style={{
                    borderTopColor: "var(--color-primary)",
                    borderRightColor: "var(--color-primary-muted)",
                  }}
                />
              </div>
            )}

            {assets.length === 0 && !isLoading ? (
              <div
                className="rounded-3xl px-6 py-10 text-center"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))",
                  border:
                    "2px dashed color-mix(in srgb, var(--color-primary) 28%, transparent)",
                }}
              >
                <div className="mb-3 flex items-center justify-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
                    }}
                  >
                    <CubeTransparentIcon
                      className="h-8 w-8"
                      style={{ color: "var(--color-primary)" }}
                    />
                  </div>
                </div>
                <p className="text-base font-bold text-app-title">
                  Belum ada aset
                </p>
                {isAdmin && (
                  <p className="mt-1.5 text-sm text-app-body-muted">
                    Tambah aset pertama untuk mulai inventarisasi
                  </p>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => router.push("/asset-rt/new")}
                    className="mx-auto mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-95"
                    style={{
                      background: "var(--color-primary)",
                      boxShadow: "0 6px 20px -6px var(--color-primary-shadow)",
                    }}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Tambah Aset Pertama
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {assets.map((asset) => {
                  const catName = asset.category?.name;
                  const themeColor = catName
                    ? getCategoryColor(catName)
                    : THEME_COLORS[5];

                  const tags: { label: string; className: string }[] = [];
                  if (catName) {
                    tags.push({
                      label: catName,
                      className: `${themeColor.bg} ${themeColor.text}`,
                    });
                  }
                  tags.push({
                    label: getUsageLabel(asset.is_used),
                    className: getUsageColor(asset.is_used),
                  });
                  for (const t of asset.tags.slice(0, 3)) {
                    if (t !== catName) {
                      tags.push({
                        label: t,
                        className: "bg-[#F0EFEA] text-[#777]",
                      });
                    }
                  }

                  return (
                    <article
                      key={asset.id}
                      className="overflow-hidden rounded-2xl bg-app-surface shadow-sm"
                    >
                      {asset.image_url && (
                        <div className="relative h-40 w-full overflow-hidden bg-app-surface-alt">
                          <img
                            src={asset.image_url}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                      <div className="px-4 pt-4 pb-3.5">
                        <div className="mb-3 flex items-start justify-between gap-2.5">
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-app-title">
                              {asset.name}
                            </h3>
                            {asset.location && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-app-body-muted">
                                <MapPinIcon className="h-3 w-3 shrink-0" />
                                {asset.location}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 whitespace-nowrap rounded-xl bg-app-surface-alt px-2.5 py-1 text-xs font-bold text-app-title">
                            {asset.quantity} {asset.unit_label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag.label}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tag.className}`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>

                        <div
                          className="my-3.5 h-px"
                          style={{ background: "var(--color-input-border)" }}
                        />

                        <div className="flex justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                              Tgl. pembelian
                            </span>
                            <span className="text-xs text-app-body">
                              {formatDate(asset.purchase_date)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-right">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                              Diperbarui
                            </span>
                            <span className="text-xs text-app-body">
                              {formatDate(asset.updated_at ?? asset.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5 px-4 py-2"
                        style={{ background: "var(--color-surface-alt)" }}
                      >
                        <UserIcon className="h-3 w-3 text-app-body-muted" />
                        <span className="text-[11px] text-app-body-muted">
                          Diperbarui oleh
                        </span>
                        <span className="text-[11px] font-semibold text-app-body">
                          {asset.updated_by_full_name ??
                            asset.created_by_full_name ??
                            "—"}
                        </span>
                        {asset.updated_at && (
                          <span className="ml-auto text-[10px] text-app-body-muted">
                            {timeAgo(asset.updated_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex bg-app-surface">
                        <button
                          type="button"
                          onClick={() => router.push(`/asset-rt/${asset.id}`)}
                          className="flex flex-1 items-center justify-center gap-1.5 border-none bg-transparent py-3 text-xs font-bold text-app-body-muted transition-colors hover:text-app-title"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          Detail
                        </button>
                        <div
                          className="w-px"
                          style={{ background: "var(--color-input-border)" }}
                        />
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/asset-rt/${asset.id}/edit`)
                            }
                            className="flex flex-1 items-center justify-center gap-1.5 border-none bg-transparent py-3 text-xs font-bold transition-opacity hover:opacity-70"
                            style={{ color: "var(--color-primary)" }}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="h-8" />
        </div>
      </div>
    </main>
  );
}
