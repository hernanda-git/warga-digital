"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { JasaCard, JasaCardSkeleton } from "@/components/jasa/JasaCard";
import { JasaFilters } from "@/components/jasa/JasaFilters";
import { JasaCreateModal } from "@/components/jasa/JasaCreateModal";
import { JasaEditModal } from "@/components/jasa/JasaEditModal";
import { JasaDetailModal } from "@/components/jasa/JasaDetailModal";
import { apiFetch } from "@/lib/api-client";
import {
  PlusIcon,
  WrenchScrewdriverIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import type {
  JasaServiceWithMedia,
  JasaServiceDetailWithMedia,
} from "@/types/database";

interface JasaListApiResponse {
  success: boolean;
  error?: string;
  data: {
    services: JasaServiceWithMedia[];
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

export default function JasaPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [services, setServices] = useState<JasaServiceWithMedia[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; icon: string | null }>
  >([]);
  const [communityName, setCommunityName] = useState<string>("");
  const [communityId, setCommunityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalServices, setTotalServices] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<boolean | null>(null);
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    senin: true,
    selasa: true,
    rabu: true,
    kamis: true,
    jumat: true,
    sabtu: true,
    minggu: false,
    tanggal_merah: false,
  });
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // ── Modals ────────────────────────────────────────────────────────────────
  // ── Modals ────────────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<JasaServiceDetailWithMedia | null>(null);
  const [viewingService, setViewingService] =
    useState<JasaServiceDetailWithMedia | null>(null);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // ── Fetch categories and community name (once) ────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const catRes = await fetch("/api/jasa?limit=1");
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.success) {
            setCategories(catData.data.filters.categories);
          }
        }

        // Fetch community name and id - try cookie first (client-side), then public API
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
          // Fallback: fetch from public API (no auth required)
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
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const fetchServices = useCallback(async () => {
    console.log("[Jasa Page] fetchServices called with params:", {
      page,
      limit,
      selectedCategory,
      selectedStatus,
      searchQuery,
      minPrice,
      maxPrice,

      selectedDays,
      communityId,
    });
    setIsLoading(true);

    setError(null);

    try {
      const params = new URLSearchParams();

      params.set("page", page.toString());

      params.set("limit", limit.toString());

      if (selectedCategory) params.set("category_id", selectedCategory);

      if (selectedStatus !== null)
        params.set("is_available", selectedStatus.toString());

      if (searchQuery) params.set("q", searchQuery);

      if (minPrice !== null) params.set("min_price", minPrice.toString());

      if (maxPrice !== null) params.set("max_price", maxPrice.toString());

      const activeDays = Object.entries(selectedDays)

        .filter(([, value]) => value)

        .map(([day]) => day);

      if (activeDays.length > 0 && activeDays.length < 7) {
        params.set("hari", activeDays[0]);
      }

      if (communityId) params.set("community_id", communityId);

      const queryString = params.toString();
      console.log("[Jasa Page] API query string:", queryString);

      const response = await apiFetch(`/api/jasa?${queryString}`);
      const data: JasaListApiResponse = await response.json();

      console.log("[Jasa Page] API response:", {
        ok: response.ok,
        success: data.success,
        servicesCount: data.data?.services?.length,
        total: data.data?.pagination?.total,
        error: data.error,
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat layanan");
      }

      setServices(data.data.services);

      setTotalPages(data.data.pagination.total_pages);

      setTotalServices(data.data.pagination.total);

      setAvailableCount(
        data.data.services.filter((s) => s.is_available).length,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat layanan";

      console.error("[Jasa Page] fetchServices error:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,

    selectedCategory,

    selectedStatus,

    selectedDays,

    searchQuery,

    minPrice,

    maxPrice,

    communityId,
  ]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedDays,
    minPrice,
    maxPrice,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateSubmit = async (formData: FormData) => {
    console.log("[Jasa Page] handleCreateSubmit called");
    const response = await apiFetch("/api/jasa", {
      method: "POST",

      body: formData,
    });

    const data = await response.json();

    console.log("[Jasa Page] Create response:", {
      ok: response.ok,
      success: data.success,
      error: data.error,
    });
    if (!response.ok) throw new Error(data.error || "Gagal membuat layanan");

    await fetchServices();
  };

  const handleEditSubmit = async (data: any) => {
    if (!editingService) return;

    console.log(
      "[Jasa Page] handleEditSubmit called for service:",
      editingService.id,
    );
    setIsEditingLoading(true);

    try {
      const response = await apiFetch(`/api/jasa/${editingService.id}`, {
        method: "PUT",

        body: JSON.stringify(data),
      });

      const result = await response.json();

      console.log("[Jasa Page] Edit response:", {
        ok: response.ok,
        success: result.success,
        error: result.error,
      });
      if (!response.ok)
        throw new Error(result.error || "Gagal memperbarui layanan");

      await fetchServices();
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    console.log("[Jasa Page] handleDeleteService called for id:", id);
    const response = await apiFetch(`/api/jasa/${id}`, { method: "DELETE" });

    const data = await response.json();

    console.log("[Jasa Page] Delete response:", {
      ok: response.ok,
      success: data.success,
      error: data.error,
    });
    if (!response.ok) throw new Error(data.error || "Gagal menghapus layanan");

    setViewingService(null);
  };

  const handleContact = (service: JasaServiceWithMedia) => {
    if (service.wa_number) {
      const message = encodeURIComponent(
        `Halo, saya tertarik dengan layanan "${service.name}". Apakah masih tersedia?`,
      );
      window.open(
        `https://wa.me/${service.wa_number.replace(/[^0-9]/g, "")}?text=${message}`,
        "_blank",
      );
    }
  };

  const handleViewService = async (serviceId: string) => {
    try {
      const response = await apiFetch(`/api/jasa/${serviceId}`);
      const data = await response.json();
      if (data.success) {
        setViewingService(data.data);
      }
    } catch (err) {
      console.error("Failed to view service:", err);
    }
  };

  const hasActiveFilters =
    !!searchQuery || !!selectedCategory || selectedStatus !== null;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedStatus(null);
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Jasa & Layanan"
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative z-10">
            {/* Nav row */}
            <div className="flex items-center gap-3">
              {/* Back button */}
              <button
                type="button"
                onClick={() => router.push("/landing")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeftIcon className="h-4 w-4 text-white" />
              </button>

              {/* Title */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Layanan Jasa Warga
                </p>
                <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                  {communityName}
                </h1>
              </div>

              {/* Add button */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-[11px] font-bold text-primary backdrop-blur-sm transition hover:bg-white/90 active:scale-95"
                aria-label="Tambah layanan baru"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Total",
                  value: isLoading ? "—" : totalServices,
                },
                {
                  label: "Tersedia",
                  value: isLoading ? "—" : availableCount,
                },
                {
                  label: "Kategori",
                  value: isLoading ? "—" : categories.length,
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

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <section className="px-4 pt-4">
          <JasaFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedDays={selectedDays}
            onDaysChange={setSelectedDays}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            minPrice={minPrice}
            onMinPriceChange={setMinPrice}
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
          />
        </section>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <section className="px-4 pb-6 pt-4">
          {/* Error State */}
          {error && (
            <div
              className="mb-5 rounded-2xl p-4 text-center"
              style={{
                background:
                  "color-mix(in srgb, #ef4444 8%, var(--color-surface))",
                border:
                  "1.5px solid color-mix(in srgb, #ef4444 22%, transparent)",
              }}
            >
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                onClick={fetchServices}
                className="mt-2 text-sm font-semibold text-red-600 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Loading — Skeleton Grid */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <JasaCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && services.length === 0 && !error && (
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
                  <WrenchScrewdriverIcon
                    className="h-8 w-8"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
              </div>
              <p className="text-base font-bold text-app-title">
                {hasActiveFilters
                  ? "Tidak ada layanan ditemukan"
                  : "Belum ada layanan"}
              </p>
              <p className="mt-1.5 text-sm text-app-body-muted">
                {hasActiveFilters
                  ? "Coba ubah atau hapus filter untuk melihat lebih banyak layanan."
                  : "Jadilah yang pertama menambahkan layanan di lingkunganmu!"}
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
                  Tambah Layanan Pertama
                </button>
              )}
            </div>
          )}

          {/* Services Grid */}
          {!isLoading && services.length > 0 && (
            <>
              {/* Results info + quick reset */}
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-app-body-muted">
                  {services.length} dari {totalServices} layanan
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

              <div className="flex flex-col gap-3">
                {services.map((service) => (
                  <JasaCard
                    key={service.id}
                    service={service}
                    onClick={() => handleViewService(service.id)}
                    onContact={() => handleContact(service)}
                  />
                ))}
              </div>

              {/* Pagination */}
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

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <JasaCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        categories={categories}
      />

      <JasaEditModal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        onSubmit={handleEditSubmit}
        service={editingService}
        categories={categories}
        isLoading={isEditingLoading}
      />

      <JasaDetailModal
        isOpen={!!viewingService}
        onClose={() => setViewingService(null)}
        onEdit={() => {
          if (viewingService) {
            setEditingService(viewingService);
            setViewingService(null);
          }
        }}
        onDelete={handleDeleteService}
        service={viewingService}
      />
    </main>
  );
}
