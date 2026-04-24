"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { JualanCard, JualanCardSkeleton } from "@/components/jualan/JualanCard";
import { JualanFilters } from "@/components/jualan/JualanFilters";
import { JualanCreateModal } from "@/components/jualan/JualanCreateModal";
import { JualanEditModal } from "@/components/jualan/JualanEditModal";
import { JualanDetailModal } from "@/components/jualan/JualanDetailModal";
import { apiFetch } from "@/lib/api-client";
import {
  PlusIcon,
  ShoppingCartIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import type { JualanGoodsDetail } from "@/types/jualan";

interface JualanListApiResponse {
  success: boolean;
  error?: string;
  data: {
    goods: Array<{
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
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
    filters: {
      categories: Array<{ id: string; name: string; icon: string | null }>;
    };
  };
}

export default function JualanPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [goods, setGoods] = useState<JualanListApiResponse["data"]["goods"]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; icon: string | null }>
  >([]);
  const [communityName, setCommunityName] = useState<string>("");
  const [communityId, setCommunityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalGoods, setTotalGoods] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [totalSold, setTotalSold] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoods, setEditingGoods] = useState<JualanGoodsDetail | null>(
    null,
  );
  const [viewingGoods, setViewingGoods] = useState<JualanGoodsDetail | null>(
    null,
  );
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await fetch("/api/jualan?limit=1");
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.success) {
            setCategories(catData.data.filters.categories);
          }
        }

        const cookies = document.cookie;
        const match = cookies.match(/community_name=([^;]+)/);
        const matchId = cookies.match(/community_id=([^;]+)/);
        if (match && match[1]) {
          setCommunityName(decodeURIComponent(match[1]));
        }
        if (matchId && matchId[1]) {
          setCommunityId(decodeURIComponent(matchId[1]));
        }
        if (!match || !matchId) {
          const comRes = await fetch("/api/community/info");
          if (comRes.ok) {
            const comData = await comRes.json();
            if (comData.communityName && !match) {
              setCommunityName(comData.communityName);
            }
            if (comData.communityId && !matchId) {
              setCommunityId(comData.communityId);
            }
          }
        }
      } catch (err) {
      }
    };
    fetchData();
  }, []);

  const fetchGoods = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (selectedCategory) params.set("category_id", selectedCategory);
      if (searchQuery) params.set("q", searchQuery);
      if (minPrice !== null) params.set("min_price", minPrice.toString());
      if (maxPrice !== null) params.set("max_price", maxPrice.toString());
      if (sortBy) params.set("sort", sortBy);
      if (communityId) params.set("community_id", communityId);

      const queryString = params.toString();
      const response = await apiFetch(`/api/jualan?${queryString}`);
      const data: JualanListApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat data barang");
      }

      setGoods(data.data.goods);
      setTotalPages(data.data.pagination.total_pages);
      setTotalGoods(data.data.pagination.total);

      const available = data.data.goods.filter((g) => g.stock_qty > 0).length;
      const sold = data.data.goods.reduce((sum, g) => sum + g.sold_count, 0);

      setAvailableCount(available);
      setTotalSold(
        page === 1 ? sold : totalSold,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory, searchQuery, minPrice, maxPrice, sortBy, communityId]);

  useEffect(() => {
    fetchGoods();
  }, [fetchGoods]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, minPrice, maxPrice, sortBy]);

  const handleCreateSubmit = async (formData: any) => {
    await fetchGoods();
  };

  const handleEditSubmit = async (data: any) => {
    if (!editingGoods) return;

    setIsEditingLoading(true);

    try {
      const response = await apiFetch(`/api/jualan/${editingGoods.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Gagal memperbarui barang");
      }

      await fetchGoods();
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleDeleteGoods = async (id: string) => {
    const response = await apiFetch(`/api/jualan/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gagal menghapus barang");
    }

    setViewingGoods(null);
  };

  const handleViewGoods = async (goodsId: string) => {
    try {
      const response = await apiFetch(`/api/jualan/${goodsId}`);
      const data = await response.json();
      if (data.success) {
        setViewingGoods(data.data);
      }
    } catch (err) {
    }
  };

  const hasActiveFilters =
    !!searchQuery || !!selectedCategory || minPrice !== null || maxPrice !== null;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setMinPrice(null);
    setMaxPrice(null);
    setSortBy("newest");
  };

  if (!isAuthenticated) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Jualan"
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
              <button
                type="button"
                onClick={() => router.push("/landing")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeftIcon className="h-4 w-4 text-white" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Pasar Warga
                </p>
                <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                  {communityName}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-[11px] font-bold text-primary backdrop-blur-sm transition hover:bg-white/90 active:scale-95"
                aria-label="Tambah barang baru"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Jual
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Total Barang",
                  value: isLoading ? "—" : totalGoods,
                },
                {
                  label: "Tersedia",
                  value: isLoading ? "—" : availableCount,
                },
                {
                  label: "Terjual",
                  value: isLoading ? "—" : totalSold,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pt-4">
          <JualanFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            minPrice={minPrice}
            onMinPriceChange={setMinPrice}
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </section>

        <section className="px-4 pb-6 pt-4">
          {error && (
            <div
              className="mb-5 rounded-2xl p-4 text-center"
              style={{
                background: "color-mix(in srgb, #ef4444 8%, var(--color-surface))",
                border: "1.5px solid color-mix(in srgb, #ef4444 22%, transparent)",
              }}
            >
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                onClick={fetchGoods}
                className="mt-2 text-sm font-semibold text-red-600 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <JualanCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && goods.length === 0 && !error && (
            <div
              className="rounded-3xl px-6 py-10 text-center"
              style={{
                background:
                  "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))",
                border: "2px dashed color-mix(in srgb, var(--color-primary) 28%, transparent)",
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
                  <ShoppingCartIcon
                    className="h-8 w-8"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
              </div>
              <p className="text-base font-bold text-app-title">
                {hasActiveFilters
                  ? "Tidak ada barang ditemukan"
                  : "Belum ada barang dijual"}
              </p>
              <p className="mt-1.5 text-sm text-app-body-muted">
                {hasActiveFilters
                  ? "Coba ubah atau hapus filter untuk melihat lebih banyak barang."
                  : "Jadilah yang pertama menjual barang di lingkunganmu!"}
              </p>

              {hasActiveFilters ? (
                <button
                  onClick={handleResetFilters}
                  className="mx-auto mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all active:scale-95"
                  style={{
                    border: "1.5px solid var(--color-primary)",
                    color: "var(--color-primary)",
                    background:
                      "color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))",
                  }}
                >
                  Hapus semua filter
                </button>
              ) : (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mx-auto mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all active:scale-95"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 6px 20px -6px var(--color-primary-shadow)",
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  Jual Barang Pertama
                </button>
              )}
            </div>
          )}

          {!isLoading && goods.length > 0 && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-app-body-muted">
                  {goods.length} dari {totalGoods} barang
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Reset filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {goods.map((item) => (
                  <JualanCard
                    key={item.id}
                    goods={item}
                    onClick={() => handleViewGoods(item.id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
                    style={{
                      border: "1.5px solid var(--color-input-border)",
                      color: "var(--color-body)",
                      background: "var(--color-surface)",
                    }}
                  >
                    ← Sebelumnya
                  </button>

                  <span className="text-xs font-medium text-app-body-muted">
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
                    style={{
                      background: "var(--color-primary)",
                      boxShadow: "0 4px 12px -4px var(--color-primary-shadow)",
                    }}
                  >
                    Selanjutnya →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="h-8" />
      </div>

      <JualanCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        categories={categories}
      />

      <JualanEditModal
        isOpen={!!editingGoods}
        onClose={() => setEditingGoods(null)}
        onSubmit={handleEditSubmit}
        goods={editingGoods}
        categories={categories}
        isLoading={isEditingLoading}
      />

      <JualanDetailModal
        isOpen={!!viewingGoods}
        onClose={() => setViewingGoods(null)}
        onEdit={() => {
          if (viewingGoods) {
            setEditingGoods(viewingGoods);
            setViewingGoods(null);
          }
        }}
        onDelete={handleDeleteGoods}
        goods={viewingGoods}
      />
    </main>
  );
}
