"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WargaItem {
  tenant_user_id: string;
  user_id: string;
  full_name: string;
  wa_number: string | null;
  blok_rumah: string | null;
  joined_at: string | null;
  last_active_at: string | null;
  roles: string[];
}

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Tidak diketahui";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function maskWA(wa: string | null): string {
  if (!wa) return "—";
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 6) return wa;
  return digits.slice(0, 4) + "••••" + digits.slice(-3);
}

function formatRoleName(name: string): string {
  return name
    .replace(/^(RT_|RW_|SYS_)/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminWargaPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wargaList, setWargaList] = useState<WargaItem[]>([]);
  const [blokList, setBlokList] = useState<string[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [total, setTotal] = useState(0);
  const [joinedThisMonth, setJoinedThisMonth] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeBlok, setActiveBlok] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedOnceRef = useRef(false);
  const PAGE_SIZE = 30;

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Access guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/warga");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/admin/me");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin/warga");
            return;
          }
          router.replace("/landing");
          return;
        }
        const profile = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(profile)) {
          router.replace("/landing");
          return;
        }
      } catch {
        router.replace("/landing");
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser]);

  // ── Load warga (server-side search, blok filter and pagination) ────────────
  const loadWarga = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!loadedOnceRef.current) {
      setLoading(true);
    } else {
      setFetching(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (query.trim()) params.set("q", query.trim());
      if (activeBlok) params.set("blok", activeBlok);

      const res = await apiFetch(`/api/admin/warga?${params.toString()}`);
      const body = (await res.json().catch(() => ({}))) as {
        warga?: WargaItem[];
        blokList?: string[];
        meta?: {
          total: number;
          totalAll: number;
          joinedThisMonth: number;
          page: number;
          limit: number;
          hasMore: boolean;
        };
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat daftar warga");
        return;
      }

      const list = body.warga ?? [];
      setWargaList(list);
      setBlokList(body.blokList ?? []);
      setTotalAll(body.meta?.totalAll ?? list.length);
      setTotal(body.meta?.total ?? list.length);
      setJoinedThisMonth(body.meta?.joinedThisMonth ?? 0);
      setHasMore(body.meta?.hasMore ?? false);
    } catch {
      setError("Gagal memuat daftar warga. Periksa koneksi Anda.");
    } finally {
      loadedOnceRef.current = true;
      setLoading(false);
      setRefreshing(false);
      setFetching(false);
    }
  }, [page, query, activeBlok]);

  // Start the data request immediately; the profile guard runs in parallel
  // above and only decides whether the result may be rendered.
  useEffect(() => {
    if (hasMounted && isAuthenticated) {
      void loadWarga();
    }
  }, [hasMounted, isAuthenticated, loadWarga]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setQueryInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value);
      setPage(1);
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryInput("");
    setQuery("");
    setPage(1);
  }, []);

  const selectBlok = useCallback((blok: string) => {
    setActiveBlok(blok);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryInput("");
    setQuery("");
    setActiveBlok("");
    setPage(1);
  }, []);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat daftar warga..." />;
  }

  const hasActiveFilter = !!query || !!activeBlok;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Gradient Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
        aria-label="Header halaman warga"
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
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 lg:hidden"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Admin RT · Kelola
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                Daftar Warga
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void loadWarga(true)}
              disabled={refreshing || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan data"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Stats strip */}
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            aria-label="Ringkasan warga"
          >
            {/* Total Warga */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Total Warga
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p className="text-base font-extrabold leading-tight text-white">
                  {totalAll}
                </p>
              )}
            </div>

            {/* Ditampilkan */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Ditampilkan
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p className="text-base font-extrabold leading-tight text-white">
                  {wargaList.length}
                </p>
              )}
            </div>

            {/* Baru Bulan Ini */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Baru Bulan Ini
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p
                  className={`text-base font-extrabold leading-tight ${
                    joinedThisMonth > 0 ? "text-amber-200" : "text-white"
                  }`}
                >
                  {joinedThisMonth}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Search + Filter Bar ────────────────────────────────────── */}
      <div className="shrink-0 space-y-2.5 bg-app-surface-alt px-4 pb-3 pt-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadWarga(true)}
              className="shrink-0 text-xs font-semibold text-red-500 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Search input */}
        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
          <input
            type="search"
            value={queryInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Cari nama, nomor WA, atau blok..."
            className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
          />
          {queryInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-app-body-muted/60 hover:text-app-body-muted"
              aria-label="Hapus pencarian"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter pills — blok rumah */}
        {blokList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => selectBlok("")}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                !activeBlok
                  ? "text-white shadow-sm"
                  : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
              }`}
              style={
                !activeBlok ? { background: "var(--color-primary)" } : undefined
              }
            >
              Semua
            </button>

            {blokList.map((blok) => {
              const isActive = activeBlok.toLowerCase() === blok.toLowerCase();
              return (
                <button
                  key={blok}
                  type="button"
                  onClick={() => selectBlok(isActive ? "" : blok)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                    isActive
                      ? "text-white shadow-sm"
                      : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                  }`}
                  style={
                    isActive
                      ? { background: "var(--color-primary)" }
                      : undefined
                  }
                >
                  {blok}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable Warga List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
        {fetching && (
          <div
            className="mb-2 h-0.5 w-full overflow-hidden rounded-full bg-app-surface-alt"
            role="progressbar"
            aria-label="Memuat data warga"
          >
            <div
              className="h-full w-1/2 animate-pulse rounded-full"
              style={{ background: "var(--color-primary)" }}
            />
          </div>
        )}
        {loading && !refreshing ? (
          /* Skeletons */
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="animate-pulse rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-app-surface-alt" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-36 rounded bg-app-surface-alt" />
                    <div className="h-3 w-20 rounded bg-app-surface-alt" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-app-surface-alt" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="h-3 w-24 rounded bg-app-surface-alt" />
                  <div className="h-3 w-28 rounded bg-app-surface-alt" />
                  <div className="col-span-2 h-3 w-36 rounded bg-app-surface-alt" />
                </div>
              </div>
            ))}
          </div>
        ) : wargaList.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-12 text-center">
            <UsersIcon
              className="h-10 w-10 text-app-body-muted/30"
              aria-hidden
            />
            <div>
              <p className="text-sm font-bold text-app-body-muted">
                {hasActiveFilter
                  ? "Tidak ada warga yang cocok"
                  : "Belum ada data warga"}
              </p>
              <p className="mt-1 text-xs text-app-body-muted/70">
                {hasActiveFilter
                  ? "Coba ubah kata kunci atau filter blok"
                  : "Warga yang terdaftar akan tampil di sini"}
              </p>
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          /* Warga card list */
          <div className="space-y-2.5">
            {wargaList.map((warga) => {
              const initials = getInitials(warga.full_name);
              const primaryRole = warga.roles[0] ?? null;

              return (
                <article
                  key={warga.tenant_user_id}
                  className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  {/* Top row: avatar · name · role badge */}
                  <div className="flex items-start gap-3">
                    {/* Initials avatar */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm"
                      style={{ background: "var(--color-primary)" }}
                      aria-hidden
                    >
                      {initials}
                    </div>

                    {/* Name + blok */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-tight text-app-title">
                        {warga.full_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-app-body-muted">
                        {warga.blok_rumah
                          ? `Blok ${warga.blok_rumah}`
                          : "Blok tidak diketahui"}
                      </p>
                    </div>

                    {/* Role badge */}
                    {primaryRole ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-app-primary">
                        <ShieldCheckIcon className="h-2.5 w-2.5" aria-hidden />
                        {formatRoleName(primaryRole)}
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-app-surface-alt px-2 py-0.5 text-[10px] font-semibold text-app-body-muted">
                        Warga
                      </span>
                    )}
                  </div>

                  {/* Detail row */}
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-app-body-muted">
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {maskWA(warga.wa_number)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDaysIcon
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">
                        Bergabung {formatJoinedDate(warga.joined_at)}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        Aktif:{" "}
                        <span
                          className={
                            warga.last_active_at
                              ? "font-medium text-app-body"
                              : "italic"
                          }
                        >
                          {formatLastActive(warga.last_active_at)}
                        </span>
                      </span>
                    </div>
                    {warga.roles.length > 1 && (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <ShieldCheckIcon
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">
                          {warga.roles.map(formatRoleName).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Footer count + pagination */}
            <div className="flex flex-col items-center gap-2 pb-2 pt-1">
              <p className="text-[10px] text-app-body-muted/50">
                Menampilkan {rangeStart}–{rangeEnd} dari {total} warga
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || fetching}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-surface-alt text-app-body transition active:scale-95 disabled:opacity-40"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="min-w-16 text-center text-[11px] font-semibold text-app-body-muted">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore || fetching}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-surface-alt text-app-body transition active:scale-95 disabled:opacity-40"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
