"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { PrimaryButton, PageLoader } from "@/components/ui";
import {
  formatRupiah,
  parseAmountInput,
  getMonthNameIndonesian,
  applyTemplate,
} from "@/lib/kas-rt-utils";
import { DEFAULT_INCOME_AMOUNT } from "@/lib/kas-rt-constants";
import { toast } from "sonner";
import type { KasRtHouse, KasRtCategory } from "@/types/kas-rt";

// ── Constants ───────────────────────────────────────────────────────────────

interface DuplicateInfo {
  id: string;
  title: string;
  amount: number;
  date: string;
}

/** Quick‑select nominal amounts for one‑tap input */
const BASE_IPL = 120_000;

const AMOUNT_PRESETS = [
  { label: "120rb", value: String(BASE_IPL) },
  { label: "240rb", value: String(BASE_IPL * 2) },
  { label: "360rb", value: String(BASE_IPL * 3) },
  { label: "480rb", value: String(BASE_IPL * 4) },
  { label: "600rb", value: String(BASE_IPL * 5) },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function groupHousesByLetter(houses: KasRtHouse[]): Map<string, KasRtHouse[]> {
  const groups = new Map<string, KasRtHouse[]>();
  for (const house of houses) {
    if (!house.blok_rumah) continue;
    const letter = house.blok_rumah.charAt(0).toUpperCase();
    if (!groups.has(letter)) {
      groups.set(letter, []);
    }
    groups.get(letter)!.push(house);
  }
  for (const [, list] of groups) {
    list.sort((a, b) => naturalSort(a.blok_rumah, b.blok_rumah));
  }
  return new Map(
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  );
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function KasRtNewPage() {
  const router = useRouter();
  const [houses, setHouses] = useState<KasRtHouse[]>([]);
  const [isLoadingHouses, setIsLoadingHouses] = useState(true);
  const [housesError, setHousesError] = useState<string | null>(null);
  const [selectedBlok, setSelectedBlok] = useState<string>("");
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);
  const [amount, setAmount] = useState(DEFAULT_INCOME_AMOUNT);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [iplCategory, setIplCategory] = useState<KasRtCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<
    DuplicateInfo[] | null
  >(null);
  const [pendingOverride, setPendingOverride] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const monthName = useMemo(() => getMonthNameIndonesian(new Date()), []);
  const groupedHouses = useMemo(() => groupHousesByLetter(houses), [houses]);

  // ── Initial data fetch ──────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoadingHouses(true);
        const [housesRes, categoriesRes] = await Promise.all([
          apiFetch("/api/kas-rt/houses"),
          apiFetch("/api/kas-rt/categories"),
        ]);

        if (!housesRes.ok) {
          const body = (await housesRes.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Gagal memuat daftar rumah.");
        }
        const housesData = (await housesRes.json()) as KasRtHouse[];
        setHouses(housesData);

        if (categoriesRes.ok) {
          const categories = (await categoriesRes.json()) as KasRtCategory[];
          const ipl = categories.find((c) => c.name === "IPL");
          if (ipl) setIplCategory(ipl);
        }
      } catch (err) {
        setHousesError(
          err instanceof Error ? err.message : "Gagal memuat daftar rumah.",
        );
      } finally {
        setIsLoadingHouses(false);
      }
    }
    void fetchData();
  }, []);

  // ── Auto‑scroll to receipt when block is selected ──────────────────────

  const scrollToReceipt = useCallback(() => {
    requestAnimationFrame(() => {
      receiptRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  // ── Regenerate title/description when blok changes ─────────────────────

  useEffect(() => {
    if (!selectedBlok) {
      setCustomTitle("");
      setCustomDescription("");
      return;
    }
    const titleTemplate = iplCategory?.title_template ?? "IPL Bulan {bulan}";
    const descTemplate =
      iplCategory?.desc_template ??
      "Pembayaran IPL untuk blok {blok} periode {bulan}";
    setCustomTitle(
      applyTemplate(titleTemplate, { bulan: monthName, blok: selectedBlok }),
    );
    setCustomDescription(
      applyTemplate(descTemplate, { bulan: monthName, blok: selectedBlok }),
    );
    scrollToReceipt();
  }, [selectedBlok, iplCategory, monthName, scrollToReceipt]);

  // ── Amount helpers ─────────────────────────────────────────────────────

  const formattedAmount = useMemo(() => {
    const digits = parseAmountInput(amount);
    if (!digits) return "";
    return formatRupiah(Number(digits));
  }, [amount]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = parseAmountInput(e.target.value);
      setAmount(digits);
    },
    [],
  );

  const handlePresetAmount = useCallback((value: string) => {
    setAmount(value);
  }, []);

  // ── Submission ─────────────────────────────────────────────────────────

  const submitTransaction = useCallback(
    async (override: boolean) => {
      if (!selectedBlok) {
        toast.error("Pilih blok rumah terlebih dahulu.");
        return;
      }
      const amountNumber = Number(amount);
      if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
        toast.error("Nominal IPL tidak valid.");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiFetch("/api/kas-rt/transactions/ipl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blok_rumah: selectedBlok,
            amount: amountNumber,
            override,
            title: customTitle.trim() || undefined,
            details: customDescription.trim() || undefined,
          }),
        });

        if (res.status === 409) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
            duplicates?: DuplicateInfo[];
          };
          setDuplicateWarning(body.duplicates ?? []);
          setPendingOverride(true);
          toast.error(
            body.message ?? "Sudah ada pembayaran IPL untuk blok ini.",
          );
          return;
        }

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Gagal menyimpan transaksi IPL.");
        }

        toast.success(`IPL Blok ${selectedBlok} berhasil dicatat.`);
        router.push("/kas-rt");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menyimpan transaksi IPL.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedBlok, amount, customTitle, customDescription, router],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void submitTransaction(false);
    },
    [submitTransaction],
  );

  const handleOverride = useCallback(() => {
    setDuplicateWarning(null);
    setPendingOverride(false);
    void submitTransaction(true);
  }, [submitTransaction]);

  // ── Toggle accordion letter group ──────────────────────────────────────

  const toggleLetter = useCallback((letter: string) => {
    setExpandedLetter((prev) => (prev === letter ? null : letter));
  }, []);

  const handleSelectBlok = useCallback((blok: string) => {
    setSelectedBlok(blok);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoadingHouses) {
    return <PageLoader message="Memuat daftar rumah..." />;
  }

  if (housesError) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-app-surface-alt px-6">
        <div className="text-center">
          <p className="text-app-body mb-4">{housesError}</p>
          <PrimaryButton onPress={() => window.location.reload()}>
            Muat Ulang
          </PrimaryButton>
        </div>
      </main>
    );
  }

  const letterGroups = Array.from(groupedHouses.entries());

  return (
    <main className="flex min-h-screen flex-col bg-app-surface-alt">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 pb-40 pt-6 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-app-heading">Catat IPL</h1>
          <p className="mt-1 text-sm text-app-body-muted">
            Bulan {monthName} {new Date().getFullYear()}
          </p>
        </div>

        {/* ── Alphabet Letter Pickers ────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-body-muted">
            Pilih Blok Rumah
          </h2>

          {letterGroups.length === 0 ? (
            <p className="text-sm text-app-body-muted">
              Tidak ada data rumah aktif.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Letter chips row */}
              <div className="grid grid-cols-3 gap-3">
                {letterGroups.map(([letter]) => {
                  const isExpanded = expandedLetter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => toggleLetter(letter)}
                      className={`flex w-full aspect-square items-center justify-center rounded-2xl text-3xl font-bold transition-all duration-150 ${
                        isExpanded
                          ? "bg-app-primary text-white shadow-md shadow-app-primary/25 ring-2 ring-app-primary ring-offset-2 ring-offset-app-surface-alt scale-110"
                          : "bg-app-surface text-app-body shadow-sm hover:bg-app-primary/10 hover:text-app-primary"
                      }`}
                      aria-expanded={isExpanded}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {/* Expanded group — shows below the letter row */}
              {letterGroups.map(([letter, list]) => {
                if (expandedLetter !== letter) return null;
                return (
                  <div
                    key={`group-${letter}`}
                    className="animate-accordion-open overflow-hidden rounded-2xl border border-app-border bg-app-surface p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-app-primary/10 text-xs font-bold text-app-primary">
                        {letter}
                      </span>
                      <span className="text-xs text-app-body-muted">
                        {list.length} blok
                      </span>
                      <div className="h-px flex-1 bg-app-border" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {list.map((house) => {
                        const isSelected = selectedBlok === house.blok_rumah;
                        return (
                          <button
                            key={house.id}
                            type="button"
                            onClick={() => handleSelectBlok(house.blok_rumah)}
                            className={`flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 ${
                              isSelected
                                ? "bg-app-primary text-white shadow-md shadow-app-primary/25 ring-2 ring-app-primary ring-offset-2 ring-offset-app-surface-alt scale-105"
                                : "bg-app-surface-alt text-app-body shadow-sm hover:bg-app-primary/10 hover:text-app-primary active:scale-95"
                            }`}
                            aria-pressed={isSelected}
                          >
                            {house.blok_rumah}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Amount Input with Presets ──────────────────────────────── */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-body-muted">
            Nominal IPL
          </h2>

          {/* Quick‑select preset chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {AMOUNT_PRESETS.map((preset) => {
              const isActive = amount === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetAmount(preset.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-app-primary text-white shadow-sm shadow-app-primary/20"
                      : "border border-app-border bg-app-surface text-app-body hover:border-app-primary/30 hover:text-app-primary"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={formattedAmount}
              onChange={handleAmountChange}
              placeholder="Rp 0"
              className="w-full rounded-2xl border border-app-border bg-app-surface px-5 py-4 text-lg font-semibold text-app-heading outline-none transition-colors placeholder:text-app-body-muted focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
            />
          </div>
          <p className="mt-2 text-xs text-app-body-muted">
            Default: {formatRupiah(Number(DEFAULT_INCOME_AMOUNT))}
          </p>
        </section>

        {/* ── Transaction Confirmation Receipt ──────────────────────── */}
        <section ref={receiptRef} className="mb-8 scroll-mt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-body-muted">
            Konfirmasi Transaksi
          </h2>

          <div
            className={`relative overflow-hidden rounded-2xl border bg-app-surface shadow-sm transition-all duration-500 ease-in-out ${
              selectedBlok
                ? "max-h-[600px] border-app-border opacity-100"
                : "max-h-0 border-transparent opacity-0"
            }`}
          >
            {selectedBlok && (
              <>
                {/* Receipt header */}
                <div className="border-b-2 border-dashed border-app-border bg-app-primary/5 px-5 py-3 text-center">
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-app-primary/10 text-app-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-primary">
                    Preview Transaksi
                  </p>
                </div>

                {/* Receipt body */}
                <div className="px-5 py-4">
                  {/* Editable Title */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-app-body-muted">
                      Judul
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="–"
                      className="w-full rounded-lg border border-app-border bg-app-surface-alt px-3 py-2 text-sm font-medium text-app-heading outline-none transition-colors focus:border-app-primary focus:ring-1 focus:ring-app-primary/20"
                    />
                  </div>

                  {/* Editable Description */}
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-medium text-app-body-muted">
                      Keterangan
                    </label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="–"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-app-border bg-app-surface-alt px-3 py-2 text-sm text-app-body outline-none transition-colors focus:border-app-primary focus:ring-1 focus:ring-app-primary/20"
                    />
                  </div>

                  {/* Divider */}
                  <div className="mb-4 border-t border-dashed border-app-border" />

                  {/* Static fields */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-body-muted">Blok</span>
                      <span className="font-semibold text-app-heading">
                        {selectedBlok}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-body-muted">Nominal</span>
                      <span className="font-semibold text-app-heading">
                        {formattedAmount || "–"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-body-muted">Tanggal</span>
                      <span className="font-semibold text-app-heading">
                        {new Date().toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-body-muted">Jenis</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Pemasukan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receipt footer */}
                <div className="border-t-2 border-dashed border-app-border bg-app-surface-alt/50 px-5 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-app-body-muted">
                    Pastikan data sudah benar sebelum menyimpan
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Prompt when no block is selected */}
          {!selectedBlok && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface/50 px-5 py-10 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-app-primary/5 text-app-body-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-medium text-app-body-muted">
                Pilih blok rumah dan nominal di atas
              </p>
              <p className="mt-1 text-xs text-app-body-muted/60">
                Setelah itu konfirmasi transaksi di sini
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ── Fixed Bottom Submit ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-app-border bg-app-surface-alt/90 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-[430px]">
          <PrimaryButton
            type="submit"
            isLoading={isSubmitting}
            isDisabled={!selectedBlok || !amount}
            onPress={() =>
              void handleSubmit(
                new Event("submit") as unknown as React.FormEvent,
              )
            }
          >
            {selectedBlok ? `Simpan IPL Blok ${selectedBlok}` : "Simpan IPL"}
          </PrimaryButton>
        </div>
      </div>

      {/* ── Duplicate Warning Dialog ─────────────────────────────────── */}
      {duplicateWarning && duplicateWarning.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-app-surface p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-app-heading">
                Duplikasi Terdeteksi
              </h3>
              <p className="mt-1 text-sm text-app-body-muted">
                Blok {selectedBlok} sudah tercatat membayar IPL bulan{" "}
                {monthName} ini.
              </p>
            </div>

            <div className="mb-5 space-y-2 rounded-xl bg-app-surface-alt p-3">
              {duplicateWarning.map((dup) => (
                <div
                  key={dup.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-app-body">{dup.title}</span>
                  <span className="font-semibold text-app-heading">
                    {formatRupiah(dup.amount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <PrimaryButton onPress={handleOverride}>
                Lanjutkan Mencatat
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setDuplicateWarning(null);
                  setPendingOverride(false);
                }}
                className="w-full rounded-2xl py-3 text-sm font-medium text-app-body-muted transition-colors hover:bg-app-surface-alt"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
