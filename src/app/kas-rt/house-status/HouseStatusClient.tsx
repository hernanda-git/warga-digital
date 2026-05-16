"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { HouseTransactionStatusCardVertical } from "@/components/kas-rt";
import type { HouseTransactionStatus } from "@/types/kas-rt";

interface HouseStatusClientProps {
  communityName: string;
  canView: boolean;
  initialStatuses: HouseTransactionStatus[];
}

export default function HouseStatusClient({
  communityName,
  canView,
  initialStatuses,
}: HouseStatusClientProps) {
  const router = useRouter();
  const [statuses, setStatuses] =
    useState<HouseTransactionStatus[]>(initialStatuses);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kas-rt/house-statuses");
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = (await res.json()) as HouseTransactionStatus[];
      setStatuses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Pre-compute grouped stats (memoized by data)
  const groupedByBlok = statuses.reduce<Record<string, boolean>>((acc, s) => {
    acc[s.blokRumah] = true;
    return acc;
  }, {});
  const totalHouses = Object.keys(groupedByBlok).length;

  const paidByBlok = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s.blokRumah] = (acc[s.blokRumah] ?? 0) + s.total2026;
    return acc;
  }, {});
  const paidCount = Object.values(paidByBlok).filter(
    (t) => t >= 1440000,
  ).length;
  const totalPaid = Object.values(paidByBlok).reduce((sum, v) => sum + v, 0);
  const target = totalHouses * 1440000;
  const percentage = target > 0 ? Math.min(100, (totalPaid / target) * 100) : 0;

  // Group for list rendering
  const groupedStatuses = statuses.reduce<
    Record<string, HouseTransactionStatus>
  >((acc, s) => {
    const key = s.blokRumah;
    if (!acc[key]) {
      acc[key] = { ...s };
    } else {
      acc[key].total2026 += s.total2026;
      acc[key].monthlyStatuses = acc[key].monthlyStatuses.map(
        (val, idx) => val + (s.monthlyStatuses[idx] || 0),
      );
    }
    return acc;
  }, {});
  const uniqueStatuses = Object.values(groupedStatuses);

  const groupedByLetter = uniqueStatuses.reduce<
    Record<string, HouseTransactionStatus[]>
  >((acc, s) => {
    const letter = s.blokRumah.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(s);
    return acc;
  }, {});
  const sortedLetters = Object.keys(groupedByLetter).sort();
  sortedLetters.forEach((l) => {
    groupedByLetter[l].sort((a, b) => a.blokRumah.localeCompare(b.blokRumah));
  });

  return (
    <main className="h-full overflow-y-auto bg-app-surface-alt lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 lg:hidden"
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
                {totalHouses}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Lunas</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {paidCount}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">
                Total Dibayar
              </p>
              <p className="text-base font-extrabold text-white leading-tight">
                Rp{totalPaid.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-app-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1 text-center">
              {Math.round(percentage)}% Progres Menuju Target 2026
            </p>
          </div>
        </div>
      </section>

      <div className="flex-1">
        <div className="px-4 py-3">
          <div className="space-y-4">
            {isLoading && statuses.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-pulse text-app-body-muted">
                  Memuat data rumah...
                </div>
              </div>
            )}

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

            {sortedLetters.length > 0 && (
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
            )}

            {statuses.length > 0 && (
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
