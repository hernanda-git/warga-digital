"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ShadowTransaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  reference: string;
  details: string | null;
  category: string | null;
  is_shadow: boolean;
  created_at: string;
  created_by_full_name: string | null;
}

interface House {
  id: string;
  name: string;
  blok_rumah: string;
  status: "PRIBADI" | "KONTRAKAN";
}

function formatRupiah(value: number): string {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}Rp ${Math.abs(value).toLocaleString("id-ID")}`;
}

export default function AdminShadowTransactionsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<ShadowTransaction[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedBlok, setSelectedBlok] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [category, setCategory] = useState("IPL");
  const [customTitle, setCustomTitle] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  // Error/success
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Auth check + fetch data ───────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [txRes, housesRes] = await Promise.all([
          fetch("/api/kas-rt/transactions/shadow"),
          fetch("/api/kas-rt/houses"),
        ]);

        if (txRes.status === 401 || housesRes.status === 401) {
          router.push("/auth/login");
          return;
        }

        if (txRes.status === 403) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.transactions ?? []);
        }

        if (housesRes.ok) {
          const housesData = await housesRes.json();
          setHouses(housesData ?? []);
        }
      } catch {
        setError("Gagal memuat data.");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [router]);

  // ── Fetch transactions ────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/kas-rt/transactions/shadow");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Submit form ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const amountNum = parseFloat(amount.replace(/[^0-9\-]/g, ""));
    const yearNum = parseInt(year, 10);

    if (!selectedBlok) {
      setError("Pilih blok rumah.");
      return;
    }
    if (Number.isNaN(amountNum) || amountNum === 0) {
      setError("Nominal tidak valid. Harus bukan nol.");
      return;
    }
    if (Number.isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
      setError("Tahun tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kas-rt/transactions/shadow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blok_rumah: selectedBlok,
          amount: amountNum,
          year: yearNum,
          title: customTitle.trim() || undefined,
          category: category || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal menyimpan.");
        return;
      }

      setSuccessMsg("Transaksi bayangan berhasil dibuat.");
      setShowForm(false);
      setSelectedBlok("");
      setAmount("");
      setCustomTitle("");
      fetchTransactions();
    } catch {
      setError("Gagal menyimpan transaksi bayangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete transaction ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/kas-rt/transactions/${deletingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soft: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Gagal menghapus.");
        return;
      }

      setSuccessMsg("Transaksi bayangan berhasil dihapus.");
      setDeleteConfirming(false);
      setDeletingId(null);
      fetchTransactions();
    } catch {
      setError("Gagal menghapus transaksi bayangan.");
    }
  };

  // ── Year groups for display ───────────────────────────────────────────────
  const groupedByYear = transactions.reduce<Record<string, ShadowTransaction[]>>(
    (acc, tx) => {
      const y = tx.date.slice(0, 4);
      if (!acc[y]) acc[y] = [];
      acc[y].push(tx);
      return acc;
    },
    {},
  );

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Unauthorized state ────────────────────────────────────────────────────
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="mt-2 text-sm text-gray-500">
            Hanya Admin RT yang dapat mengakses halaman ini.
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Kembali ke Dashboard Admin
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/admin")}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 truncate">
            Transaksi Bayangan (Shadow)
          </h1>
          <p className="text-xs text-gray-500">
            Penyesuaian tahunan kas RT per blok rumah
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          {showForm ? "Batal" : "Tambah"}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-gray-900">
              Transaksi Bayangan Baru
            </h2>

            {/* Blok Rumah */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Blok Rumah
              </label>
              <select
                value={selectedBlok}
                onChange={(e) => setSelectedBlok(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih blok...</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.blok_rumah}>
                    {h.blok_rumah} — {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nominal (gunakan tanda - untuk pengurangan)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9\-]/g, ""))}
                placeholder="Contoh: 500000 atau -250000"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Nilai positif = penambahan, nilai negatif = pengurangan saldo
              </p>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tahun
              </label>
              <input
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Tanggal otomatis: 31 Desember {year}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IPL">IPL</option>
                <option value="Denda">Denda</option>
                <option value="Sumbangan">Sumbangan</option>
                <option value="Pendapatan Lain">Pendapatan Lain</option>
                <option value="Penyesuaian">Penyesuaian</option>
              </select>
            </div>

            {/* Custom Title (optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Judul Kustom (opsional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Kosongkan untuk judul otomatis"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Transaksi Bayangan"}
            </button>
          </form>
        )}

        {/* Transaction list by year */}
        {sortedYears.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Belum ada transaksi bayangan.</p>
            <p className="text-xs mt-1">Gunakan tombol &ldquo;Tambah&rdquo; untuk membuat yang baru.</p>
          </div>
        )}

        {sortedYears.map((yr) => (
          <section key={yr}>
            <h3 className="text-sm font-bold text-gray-700 mb-3">{yr}</h3>
            <div className="space-y-2">
              {groupedByYear[yr].map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {tx.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Blok {tx.reference} · {tx.category ?? "-"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Dicatat oleh: {tx.created_by_full_name ?? "Sistem"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold ${
                        tx.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatRupiah(tx.amount)}
                    </div>
                    <button
                      onClick={() => {
                        setDeletingId(tx.id);
                        setDeleteConfirming(true);
                      }}
                      className="mt-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-gray-900">
                Hapus Transaksi Bayangan?
              </h3>
              <p className="mt-1.5 text-[13px] text-gray-500">
                Transaksi yang dihapus tidak akan muncul lagi dan tidak memengaruhi perhitungan saldo.
              </p>
              <div className="mt-5 flex gap-3 w-full">
                <button
                  onClick={() => {
                    setDeleteConfirming(false);
                    setDeletingId(null);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
