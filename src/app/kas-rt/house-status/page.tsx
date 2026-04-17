"use client";

/**
 * House Status Page - Vertical Listing Design
 *
 * This page displays house payment status for 2026 in a vertically stacked layout.
 *
 * Key Features:
 * - **Vertical Stack Layout**: Cards are stacked vertically (not a grid), allowing
 *   for better readability on mobile devices.
 *
 * - **Horizontal Month Scrolling**: Each card shows 12 months (Jan-Dec) in horizontally
 *   scrollable buttons, accommodating all months even on narrow screens.
 *
 * - **Step-by-Step Filling Logic**: Payments are visualized sequentially from January.
 * - Total transactions (Rp1.440.000) are divided into 12 months = Rp120.000/month
 *   - A month only shows its status if ALL previous months are complete (≥Rp120.000)
 *   - This prevents displaying incomplete payment sequences
 *
 * - **Visual Feedback**:
 *   - Dark Green (100%): Month fully paid (≥ Rp120.000)
 *   - Light Green (50%): Month partially paid (< Rp120.000)
 *   - Gray/White (0%): Month not yet active OR no payment
 *
 * Data Binding: The component efficiently pre-calculates which months are "active"
 * rather than checking previous months repeatedly during rendering.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { useHouseTransactionStatuses } from "@/hooks/kas-rt/useHouseTransactionStatuses";
import { HouseTransactionStatusCardVertical } from "@/components/kas-rt";

export default function HouseStatusPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [communityName, setCommunityName] = useState("Test");
  const [canView, setCanView] = useState(false);
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  useEffect(() => {
    fetch("/api/kas-rt/info")
      .then((res) => res.json())
      .then((data) => setCommunityName(data.communityName))
      .catch(() => setCommunityName("Test"));
  }, []);

  // ── Permission check ──────────────────────────────────────────────────────
  useEffect(() => {
    setIsPermissionLoading(true);
    fetch("/api/kas-rt/permissions")
      .then((res) => res.json())
      .then((data) => {
        setCanView(data.canSubmitTransaction);
        setIsPermissionLoading(false);
      })
      .catch(() => {
        setCanView(false);
        setIsPermissionLoading(false);
      });
  }, []);

  // ── Mount / auth guard ────────────────────────────────────────────────────
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  // ── Hook for fetching statuses ────────────────────────────────────────────
  const { statuses, isLoading, error, refetch } = useHouseTransactionStatuses();

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || isPermissionLoading) {
    return <PageLoader message="Memuat..." />;
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main className="h-full overflow-y-auto bg-app-surface-alt flex items-center justify-center">
        <div className="text-center">
          <div className="material-symbols-outlined text-6xl text-app-body-muted/30 mb-4">
            lock
          </div>
          <h1 className="text-lg font-semibold text-app-body-muted mb-2">
            Akses Terbatas
          </h1>
          <p className="text-sm text-app-body-muted">
            Halaman ini hanya dapat diakses oleh RT Bendahara dan RT Admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-app-surface-alt">
      <section
        className="relative overflow-hidden px-4 pb-5 pt-5 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {communityName}
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                Status Rumah 2026
              </h1>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">
                Total Rumah
              </p>
              <p className="text-base font-extrabold text-white leading-tight">
                {(() => {
                  const grouped = statuses.reduce(
                    (acc, status) => {
                      acc[status.blokRumah] = true;
                      return acc;
                    },
                    {} as Record<string, boolean>,
                  );
                  return Object.keys(grouped).length;
                })()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Lunas</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {(() => {
                  const grouped = statuses.reduce(
                    (acc, status) => {
                      if (!acc[status.blokRumah]) {
                        acc[status.blokRumah] = status.total2026;
                      } else {
                        acc[status.blokRumah] += status.total2026;
                      }
                      return acc;
                    },
                    {} as Record<string, number>,
                  );
                  return Object.values(grouped).filter(
                    (total) => total >= 1440000,
                  ).length;
                })()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">
                Total Dibayar
              </p>
              <p className="text-base font-extrabold text-white leading-tight">
                Rp
                {(() => {
                  const grouped = statuses.reduce(
                    (acc, status) => {
                      if (!acc[status.blokRumah]) {
                        acc[status.blokRumah] = status.total2026;
                      } else {
                        acc[status.blokRumah] += status.total2026;
                      }
                      return acc;
                    },
                    {} as Record<string, number>,
                  );
                  return Object.values(grouped)
                    .reduce((sum, val) => sum + val, 0)
                    .toLocaleString("id-ID");
                })()}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {(() => {
              const groupedByBlok = statuses.reduce(
                (acc, status) => {
                  acc[status.blokRumah] = true;
                  return acc;
                },
                {} as Record<string, boolean>,
              );
              const totalHouses = Object.keys(groupedByBlok).length;
              const groupedPaid = statuses.reduce(
                (acc, status) => {
                  if (!acc[status.blokRumah]) {
                    acc[status.blokRumah] = status.total2026;
                  } else {
                    acc[status.blokRumah] += status.total2026;
                  }
                  return acc;
                },
                {} as Record<string, number>,
              );
              const totalPaid = Object.values(groupedPaid).reduce(
                (sum, val) => sum + val,
                0,
              );
              const target = totalHouses * 1440000;
              const percentage =
                target > 0 ? Math.min(100, (totalPaid / target) * 100) : 0;
              return (
                <>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-app-primary transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-1 text-center">
                    {Math.round(percentage)}% Progres Menuju Target 2026
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      <div className="flex-1">
        <div className="px-4 py-3">
          <div className="space-y-4">
            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-pulse text-app-body-muted">
                  Memuat data rumah...
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="rounded-2xl bg-error-container p-4">
                <div className="text-error mb-2">
                  <span className="material-symbols-outlined text-sm mr-1">
                    error
                  </span>
                  Gagal memuat data
                </div>
                <p className="text-sm text-error/80 mb-3">{error}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-error text-on-error rounded-lg text-sm font-medium hover:bg-error/90 transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && statuses.length === 0 && (
              <div className="text-center py-12">
                <div className="material-symbols-outlined text-4xl text-app-body-muted/30 mb-2">
                  house
                </div>
                <div className="text-app-body-muted">
                  Belum ada data rumah tersedia
                </div>
              </div>
            )}

            {/* House status cards - Vertical stacked layout
              Each card includes:
              - House avatar with block number initials
              - House name and block
              - Total 2026 transfer amount
              - 12 horizontally-scrollable month buttons
              - Step-by-step payment visualization
          */}
            {!isLoading &&
              !error &&
              statuses.length > 0 &&
              (() => {
                // Group statuses by blokRumah to eliminate duplicates and combine data
                const groupedStatuses = statuses.reduce(
                  (acc, status) => {
                    const key = status.blokRumah;
                    if (!acc[key]) {
                      acc[key] = { ...status };
                    } else {
                      // Sum totals and merge monthly statuses element-wise
                      acc[key].total2026 += status.total2026;
                      acc[key].monthlyStatuses = acc[key].monthlyStatuses.map(
                        (val, idx) => val + (status.monthlyStatuses[idx] || 0),
                      );
                    }
                    return acc;
                  },
                  {} as Record<string, (typeof statuses)[0]>,
                );

                const uniqueStatuses = Object.values(groupedStatuses);

                // Further group by first letter of blok name for categorized sections
                const groupedByLetter = uniqueStatuses.reduce(
                  (acc, status) => {
                    const letter = status.blokRumah.charAt(0).toUpperCase();
                    if (!acc[letter]) acc[letter] = [];
                    acc[letter].push(status);
                    return acc;
                  },
                  {} as Record<string, typeof uniqueStatuses>,
                );

                // Sort letters and statuses within each letter
                const sortedLetters = Object.keys(groupedByLetter).sort();
                sortedLetters.forEach((letter) => {
                  groupedByLetter[letter].sort((a, b) =>
                    a.blokRumah.localeCompare(b.blokRumah),
                  );
                });

                return (
                  <div className="space-y-6">
                    {sortedLetters.map((letter) => (
                      <section key={letter}>
                        <header className="sticky top-0 z-10 bg-app-surface-alt/95 backdrop-blur-sm px-4 py-3 border-b border-app-surface">
                          <h2 className="text-lg font-bold text-app-title">
                            Blok {letter}
                          </h2>
                          <p className="text-sm text-app-body-muted">
                            {groupedByLetter[letter].length} rumah
                          </p>
                        </header>
                        <div className="space-y-4">
                          {groupedByLetter[letter].map((status) => (
                            <HouseTransactionStatusCardVertical
                              key={status.blokRumah}
                              data={status}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                );
              })()}

            {/* Legend */}
            {!isLoading && !error && statuses.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    info
                  </span>
                  Informasi Status Bulanan
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 rounded-lg bg-green-800 border-2 border-green-800"></div>
                    <span className="text-gray-600">≥ Rp120.000 (Lunas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 rounded-lg bg-green-300 border-2 border-green-300"></div>
                    <span className="text-gray-600">
                      &lt; Rp120.000 (Sebagian)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 rounded-lg bg-white border-2 border-gray-200"></div>
                    <span className="text-gray-600">Belum Bayar (Kosong)</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-500 italic">
                      <span className="material-symbols-outlined text-xs mr-1">
                        lightbulb
                      </span>
                      Pembayaran diisi step-by-step dari Januari. Bulan
                      berikutnya hanya akan berwarna jika bulan sebelumnya sudah
                      lunas (≥ Rp120.000).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
