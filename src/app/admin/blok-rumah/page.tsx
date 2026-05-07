"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface HouseItem {
  id: string;
  blok_rumah: string | null;
  name: string;
  address: string | null;
  total_residents: number;
  status: string;
  is_active: boolean;
  owner_full_name?: string | null;
  source_full_name?: string | null;
  residents?: Array<{
    user_id: string;
    full_name: string;
    relationship: string | null;
  }>;
}

function statusLabel(status: string): string {
  if (status === "KONTRAKAN") return "Kontrakan";
  if (status === "KOSONG") return "Kosong";
  return "Pribadi";
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
}

type OccupancyFilter = "ALL" | "KONTRAKAN" | "PRIBADI" | "KOSONG" | "TERISI";

export default function AdminBlokRumahPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>("ALL");
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [expandedHouseIds, setExpandedHouseIds] = useState<Record<string, boolean>>({});
  const [editingHouse, setEditingHouse] = useState<HouseItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/blok-rumah");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin/blok-rumah");
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

  const loadHouses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/houses");
      const body = (await res.json().catch(() => ({}))) as {
        houses?: HouseItem[];
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat daftar blok rumah");
        return;
      }

      setHouses(body.houses ?? []);
    } catch {
      setError("Gagal memuat daftar blok rumah. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const toggleExpandedHouse = useCallback((houseId: string) => {
    setExpandedHouseIds((prev) => ({ ...prev, [houseId]: !prev[houseId] }));
  }, []);

  const openEditModal = useCallback((house: HouseItem) => {
    setEditingHouse(house);
    setEditName(house.name);
    setEditStatus(house.status);
    setEditError(null);
  }, []);

  const closeModal = useCallback(() => {
    if (editSubmitting) return;
    setEditingHouse(null);
  }, [editSubmitting]);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingHouse) return;
      setEditError(null);
      setEditSubmitting(true);
      try {
        const res = await apiFetch(`/api/admin/houses/${editingHouse.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            status: editStatus,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          house?: HouseItem;
        };
        if (!res.ok) {
          setEditError(body.error ?? "Gagal menyimpan perubahan");
          return;
        }
        setEditingHouse(null);
        setHouses((prev) =>
          prev.map((h) =>
            h.id === editingHouse.id
              ? { ...h, name: editName.trim(), status: editStatus }
              : h,
          ),
        );
      } catch {
        setEditError("Gagal menyimpan perubahan. Coba lagi.");
      } finally {
        setEditSubmitting(false);
      }
    },
    [editingHouse, editName, editStatus],
  );

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadHouses();
    }
  }, [checkingAccess, isAuthenticated, loadHouses]);

  const filteredHouses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return houses.filter((house) => {
      if (occupancyFilter === "TERISI" && (house.total_residents ?? 0) === 0) {
        return false;
      }
      if (occupancyFilter === "KOSONG" && (house.total_residents ?? 0) > 0) {
        return false;
      }
      if (
        occupancyFilter !== "ALL" &&
        occupancyFilter !== "TERISI" &&
        occupancyFilter !== "KOSONG" &&
        house.status !== occupancyFilter
      ) {
        return false;
      }
      if (!q) return true;
      const blok = (house.blok_rumah ?? "").toLowerCase();
      const name = (house.name ?? "").toLowerCase();
      const address = (house.address ?? "").toLowerCase();
      return blok.includes(q) || name.includes(q) || address.includes(q);
    });
  }, [houses, occupancyFilter, query]);

  const totalResidents = useMemo(
    () => houses.reduce((sum, house) => sum + (house.total_residents ?? 0), 0),
    [houses],
  );

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat daftar blok rumah..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Admin RT
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                List Blok Rumah
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void loadHouses(true)}
              disabled={refreshing || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Total Blok</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {houses.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Ditampilkan</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {filteredHouses.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Total Warga</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {totalResidents}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="shrink-0 bg-app-surface-alt px-4 pb-3 pt-3 space-y-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadHouses(true)}
              className="shrink-0 text-xs font-semibold text-red-600 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari blok, nama pengguna, atau alamat..."
            className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-app-body-muted/60 hover:text-app-body-muted"
              aria-label="Hapus pencarian"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { value: "ALL" as const, label: "Semua" },
            { value: "PRIBADI" as const, label: "Pribadi" },
            { value: "KONTRAKAN" as const, label: "Kontrakan" },
            { value: "KOSONG" as const, label: "Kosong" },
            { value: "TERISI" as const, label: "Terisi" },
          ].map((item) => {
            const active = occupancyFilter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setOccupancyFilter(item.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-app-primary text-white"
                    : "border border-[var(--color-input-border)] bg-app-surface text-app-body-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && !refreshing ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((k) => (
              <div
                key={k}
                className="animate-pulse rounded-2xl bg-app-surface p-4 shadow-[0_6px_20px_rgba(0,40,5,0.05)]"
              >
                <div className="h-4 w-24 rounded bg-app-surface-alt" />
                <div className="mt-2 h-3 w-40 rounded bg-app-surface-alt" />
              </div>
            ))}
          </div>
        ) : filteredHouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-12 text-center">
            <HomeModernIcon className="h-10 w-10 text-app-body-muted/40" />
            <div>
              <p className="text-sm font-semibold text-app-body-muted">
                {query ? "Tidak ada blok yang cocok" : "Belum ada data blok rumah"}
              </p>
              <p className="mt-1 text-xs text-app-body-muted/70">
                {query
                  ? "Coba gunakan kata kunci lain"
                  : "Data blok rumah akan tampil di sini"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHouses.map((house) => {
              const isExpanded = Boolean(expandedHouseIds[house.id]);
              const residents = house.residents ?? [];
              return (
                <article
                  key={house.id}
                  className="rounded-2xl bg-app-surface p-4 shadow-[0_8px_24px_rgba(0,40,5,0.06)]"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-extrabold text-app-title">
                      {house.blok_rumah ?? "-"}
                    </h2>
                    {house.name ? (
                      <p className="mt-0.5 truncate text-sm font-semibold text-app-body">
                        {toTitleCase(house.name)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-app-body-muted/60">Tanpa nama</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-app-primary-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-app-primary">
                      {statusLabel(house.status)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEditModal(house); }}
                      className="rounded-full border border-[var(--color-input-border)] p-1 text-app-body-muted transition hover:bg-app-surface-alt"
                      aria-label="Edit blok rumah"
                      title="Edit blok rumah"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpandedHouse(house.id); }}
                      className="rounded-full border border-[var(--color-input-border)] p-1 text-app-body-muted transition hover:bg-app-surface-alt"
                      aria-label={isExpanded ? "Sembunyikan daftar warga" : "Lihat daftar warga"}
                      title={isExpanded ? "Sembunyikan daftar warga" : "Lihat daftar warga"}
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-app-body-muted">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{house.total_residents ?? 0} warga</span>
                </div>

                {house.address && (
                  <p className="mt-2 line-clamp-2 text-xs text-app-body-muted">
                    {house.address}
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-3 rounded-xl border border-[var(--color-input-border)] bg-app-surface-alt/70 p-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-body-muted">
                      Daftar Warga
                    </p>
                    {residents.length === 0 ? (
                      <p className="text-xs text-app-body-muted">Belum ada warga terdaftar</p>
                    ) : (
                      <ul className="space-y-1">
                        {residents.map((resident) => (
                          <li
                            key={resident.user_id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-app-surface px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate text-app-body">{resident.full_name}</span>
                            <span className="shrink-0 rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-semibold text-app-primary">
                              {resident.relationship ?? "WARGA"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {editingHouse && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={!editSubmitting ? closeModal : undefined}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2.5rem)] flex-col rounded-3xl bg-app-surface shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
            style={{
              maxWidth: "400px",
              animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="overflow-y-auto overscroll-contain p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold text-app-title">
                    Edit Blok Rumah
                  </h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-app-body-muted">
                    {editingHouse.blok_rumah ?? "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={editSubmitting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                    Nama Rumah
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                    style={{ borderColor: "var(--color-input-border)" }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                    Status
                  </label>
                  <div className="flex gap-2">
                    {(["PRIBADI", "KONTRAKAN", "KOSONG"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={`flex-1 rounded-xl py-2 text-[11px] font-bold transition active:scale-95 ${
                          editStatus === s
                            ? "text-white shadow-sm"
                            : "bg-app-surface-alt text-app-body-muted"
                        }`}
                        style={
                          editStatus === s
                            ? {
                                background:
                                  s === "PRIBADI"
                                    ? "var(--color-primary)"
                                    : s === "KONTRAKAN"
                                      ? "#d97706"
                                      : "#6b7280",
                              }
                            : undefined
                        }
                      >
                        {statusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>

                {editError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                    <p className="text-[12px] text-red-700">{editError}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={editSubmitting}
                    className="flex-1 rounded-xl bg-app-surface-alt py-3 text-[12px] font-semibold text-app-body transition active:scale-95 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting || !editName.trim()}
                    className="flex-1 rounded-xl py-3 text-[12px] font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {editSubmitting ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </span>
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
