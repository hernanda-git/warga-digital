"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { formatRupiah, getMonthYearKey, getMonthYearSeparator } from "@/lib/kas-rt-utils";
import type { TransactionItem } from "@/types/kas-rt";

interface MonthStatus {
  name: string;
  status: "full" | "partial" | "unpaid";
  remainder?: number;
}

interface IplPageClientProps {
  blokRumah: string;
  months: MonthStatus[];
  transactions: TransactionItem[];
}

export default function IplPageClient({
  blokRumah,
  months,
  transactions,
}: IplPageClientProps) {
  const router = useRouter();

  const totalPaid = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const paidCount = months.filter((m) => m.status === "full").length;
  const targetAmount = 120000 * 12;
  const percentage = Math.min(100, (totalPaid / targetAmount) * 100);

  // Build month separators for transactions
  const txElements: React.ReactNode[] = [];
  let lastMonthKey = "";
  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const currentKey = getMonthYearKey(txDate);
    if (currentKey !== lastMonthKey) {
      txElements.push(
        <div key={`sep-${currentKey}`} className="relative py-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-app-body-muted/20" />
            <span className="rounded-full bg-app-surface px-3 py-1 text-xs font-semibold text-app-body-muted shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              {getMonthYearSeparator(txDate)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-app-body-muted/20" />
          </div>
        </div>
      );
      lastMonthKey = currentKey;
    }
    txElements.push(
      <IplTransactionCard key={tx.id} transaction={tx} />
    );
  });

  return (
    <main className="h-full overflow-y-auto bg-app-surface-alt">
      {/* Hero */}
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
                Status IPL
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                {blokRumah}
              </h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Total Dibayar</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {formatRupiah(totalPaid)}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Bulan Lunas</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {paidCount}/12
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Target</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {formatRupiah(targetAmount)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1 text-center">
              {Math.round(percentage)}% Progres IPL 2026
            </p>
          </div>
        </div>
      </section>

      {/* Month Grid */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-bold text-app-title mb-3">
          Status Bulanan
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {months.map((month, index) => {
            const getBadgeClass = () => {
              if (month.status === "full") {
                return "bg-app-primary text-white border-2 border-app-primary";
              }
              if (month.status === "partial") {
                return "bg-app-primary-muted text-app-title border-2 border-app-primary-muted";
              }
              return "bg-white border-2 border-gray-200 text-gray-400";
            };

            const getBadgeTitle = () => {
              if (month.status === "full") {
                return `${month.name}: Lunas`;
              }
              if (month.status === "partial" && month.remainder) {
                return `${month.name}: Sebagian (${formatRupiah(month.remainder)})`;
              }
              return `${month.name}: Belum bayar`;
            };

            return (
              <div
                key={index}
                className={`flex items-center justify-center rounded-xl px-2 py-3 text-xs font-bold transition-colors ${getBadgeClass()}`}
                title={getBadgeTitle()}
              >
                {month.name.slice(0, 3).toUpperCase()}
              </div>
            );
          })}
        </div>
      </section>

      {/* Transactions */}
      <section className="px-4 pb-8">
        <h2 className="text-sm font-bold text-app-title mb-3">
          Riwayat Pembayaran
        </h2>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface px-6 py-10 text-center shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
            <span className="material-symbols-outlined text-4xl text-app-body-muted/30">
              receipt_long
            </span>
            <p className="text-sm font-bold text-app-body-muted">
              Belum ada pembayaran
            </p>
            <p className="max-w-[180px] text-xs leading-relaxed text-app-body-muted/70">
              Riwayat pembayaran IPL akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">{txElements}</div>
        )}
      </section>
    </main>
  );
}

/**
 * Lightweight transaction card for IPL page.
 */
function IplTransactionCard({ transaction: tx }: { transaction: TransactionItem }) {
  return (
    <article className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {tx.category && (
            <span className="text-[10px] font-medium text-app-body-muted">
              {tx.category}
            </span>
          )}
          <h3 className="text-sm font-bold leading-snug text-app-title">
            {tx.title}
          </h3>
          {tx.details && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-body-muted">
              {tx.details}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-extrabold text-app-primary">
            +{formatRupiah(tx.amount)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-app-body-muted">
        <span>
          {new Date(tx.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {tx.reference && (
          <span className="rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-semibold text-app-primary">
            {tx.reference}
          </span>
        )}
      </div>
    </article>
  );
}
