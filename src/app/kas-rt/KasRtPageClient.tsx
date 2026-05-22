"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { getDefaultFilterDates } from "@/lib/kas-rt-constants";
import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";
import { useKasRtTransactions } from "@/lib/hooks/use-kas-rt-transactions";
import { useKasRtNewTransaction } from "@/lib/hooks/use-kas-rt-new-transaction";
import {
  KasRtHero,
  KasRtFilterBar,
  KasRtFilterSheet,
  KasRtDownloadSheet,
  KasRtTransactionList,
  KasRtDeleteConfirmDialog,
  KasRtDuplicateWarningDialog,
} from "@/components/kas-rt";
import { KasRtNewTransactionSheet } from "@/components/kas-rt/KasRtNewTransactionSheet";
import {
  KasRtPageSkeleton,
  KasRtTransactionListSkeleton,
} from "@/components/kas-rt/skeletons";
import { KasRtBackToTop } from "@/components/kas-rt/KasRtBackToTop";
import type {
  KasRtDownloadState,
  TransactionItem,
  KasRtCategory,
  KasRtTotals,
  KasRtFilterState,
} from "@/types/kas-rt";
import { toast } from "sonner";

interface KasRtPageClientProps {
  initialTransactions: TransactionItem[];
  initialTotal: number;
  initialCategories: KasRtCategory[];
  initialCanSubmitTransaction: boolean;
  initialSummary: KasRtTotals | null;
  initialFilterState: KasRtFilterState;
  initialBlockNames: string[];
}

export default function KasRtPageClient({
  initialTransactions,
  initialTotal,
  initialCategories,
  initialCanSubmitTransaction,
  initialSummary,
  initialFilterState,
  initialBlockNames,
}: KasRtPageClientProps) {
  const now = new Date();
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    transactions,
    categories,
    communityName,
    canSubmitTransaction,
    isPageLoading,
    isTransactionsLoading,
    isRefreshing,
    isLoadingMore,
    refreshedAt,
    filterState,
    setFilterState,
    isFilterOpen,
    setIsFilterOpen,
    totals,
    allCategoryNames,
    allBlockNames,
    activeAdvancedFilterCount,
    pagination,
    refreshData,
    setTransactions,
    applyFilters,
    loadMore,
    resetFilters,
  } = useKasRtTransactions({
    now,
    initialData: {
      transactions: initialTransactions,
      total: initialTotal,
      categories: initialCategories,
      canSubmitTransaction: initialCanSubmitTransaction,
      summary: initialSummary,
      filterState: initialFilterState,
      blockNames: initialBlockNames,
    },
  });

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deletingTx, setDeletingTx] = useState<TransactionItem | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // ── Download state ────────────────────────────────────────────────────────
  const defaultDownloadDates = getDefaultFilterDates(now);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<KasRtDownloadState>({
    startDate: defaultDownloadDates.startDate,
    endDate: defaultDownloadDates.endDate,
    category: "",
    block: "",
    format: "excel",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ── New transaction form hook ─────────────────────────────────────────────
  const formHook = useKasRtNewTransaction({
    categories,
    transactions,
    setTransactions,
    refreshData,
  });

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const { pullDistance, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({
      onRefresh: refreshData,
      isRefreshing,
    });

  // ── Download report handler ───────────────────────────────────────────────
  const handleDownloadReport = useCallback(async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      if (!downloadState.startDate || !downloadState.endDate) {
        setDownloadError("Tanggal mulai dan akhir wajib diisi.");
        setIsDownloading(false);
        return;
      }
      const params = new URLSearchParams();
      params.set("start", downloadState.startDate);
      params.set("end", downloadState.endDate);
      params.set("format", downloadState.format);
      if (downloadState.category.trim())
        params.set("category", downloadState.category.trim());
      if (downloadState.block.trim())
        params.set("block", downloadState.block.trim());

      const response = await apiFetch(
        `/api/kas-rt/transactions/report?${params.toString()}`,
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? "Gagal mengunduh laporan.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = downloadState.format === "excel" ? "xlsx" : "pdf";
      link.download = `laporan-kas-rt-${downloadState.startDate}-sd-${downloadState.endDate}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setIsDownloadModalOpen(false);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    } finally {
      setIsDownloading(false);
    }
  }, [downloadState]);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteTx = useCallback(async () => {
    if (!deletingTx) return;
    setIsDeleteConfirming(true);
    try {
      const res = await apiFetch(`/api/kas-rt/transactions/${deletingTx.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Gagal menghapus transaksi.");
      }
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
      setDeletingTx(null);
    } finally {
      setIsDeleteConfirming(false);
    }
  }, [deletingTx, setTransactions]);

  // ── Remove attachment handler ─────────────────────────────────────────────
  const handleRemoveAttachment = useCallback(
    async (attachmentId: string) => {
      const editingTxId = formHook.editingTxId;
      if (!editingTxId) return;
      try {
        const res = await apiFetch(
          `/api/kas-rt/transactions/${editingTxId}/attachments?attachmentIds=${attachmentId}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Gagal menghapus lampiran.");
        }
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTxId
              ? {
                  ...t,
                  attachments: t.attachments.filter(
                    (a) => a.id !== attachmentId,
                  ),
                }
              : t,
          ),
        );
        toast.success("Lampiran berhasil dihapus.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus lampiran.",
        );
      }
    },
    [formHook.editingTxId, setTransactions],
  );

  // ── Navigation handlers ───────────────────────────────────────────────────
  const handleOpenForm = useCallback(() => {
    formHook.openForm();
  }, [formHook]);

  const handleOpenEditForm = useCallback(
    (tx: TransactionItem) => {
      formHook.openEditForm(tx);
    },
    [formHook],
  );

  const handleOpenSummary = useCallback(() => {
    router.push("/kas-rt/summary");
  }, [router]);

  const handleOpenHouseStatus = useCallback(() => {
    router.push("/kas-rt/house-status");
  }, [router]);

  // ── Reset filter handler ──────────────────────────────────────────────────
  const handleResetFilter = useCallback(async () => {
    await resetFilters();
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetFilters]);

  // ── Editing tx attachments ────────────────────────────────────────────────
  const editingTxAttachments = formHook.editingTxId
    ? (transactions.find((t) => t.id === formHook.editingTxId)?.attachments ?? null)
    : null;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isPageLoading) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt lg:py-6">
        <KasRtPageSkeleton />
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt lg:py-6">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >
        <KasRtHero
          communityName={communityName}
          now={now}
          totals={totals}
          canSubmitTransaction={canSubmitTransaction}
          isRefreshing={isRefreshing}
          onRefresh={() => void refreshData()}
          onOpenDownload={() => {
            setDownloadError(null);
            setIsDownloadModalOpen(true);
          }}
          onOpenForm={handleOpenForm}
          onOpenSummary={handleOpenSummary}
          onOpenHouseStatus={handleOpenHouseStatus}
        />

        <KasRtFilterBar
          typeFilter={filterState.typeFilter}
          setTypeFilter={(type) =>
            setFilterState((prev) => ({ ...prev, typeFilter: type }))
          }
          activeAdvancedFilterCount={activeAdvancedFilterCount}
          onOpenFilter={() => setIsFilterOpen(true)}
        />

        {isTransactionsLoading ? (
          <KasRtTransactionListSkeleton count={5} />
        ) : (
          <KasRtTransactionList
            transactions={transactions}
            canSubmitTransaction={canSubmitTransaction}
            now={now}
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            refreshedAt={refreshedAt}
            onEdit={handleOpenEditForm}
            onDelete={setDeletingTx}
            onResetFilter={handleResetFilter}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            hasMore={pagination.hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            totalCount={pagination.total}
          />
        )}
      </div>

      <KasRtFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterState={filterState}
        setFilterState={setFilterState}
        allCategoryNames={allCategoryNames}
        allBlockNames={allBlockNames}
        now={now}
        onApply={applyFilters}
      />

      <KasRtDownloadSheet
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        downloadState={downloadState}
        setDownloadState={setDownloadState}
        allCategoryNames={allCategoryNames}
        allBlockNames={allBlockNames}
        isDownloading={isDownloading}
        downloadError={downloadError}
        onDownload={handleDownloadReport}
      />

      <KasRtNewTransactionSheet
        {...formHook}
        editingTxAttachments={editingTxAttachments}
        onRemoveAttachment={handleRemoveAttachment}
      />

      <KasRtDuplicateWarningDialog
        duplicateWarning={formHook.duplicateWarning}
        formReference={formHook.form.reference}
        onClose={() => formHook.setDuplicateWarning(null)}
      />

      <KasRtDeleteConfirmDialog
        deletingTx={deletingTx}
        isDeleteConfirming={isDeleteConfirming}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteTx}
      />

      <KasRtBackToTop
        containerRef={scrollContainerRef}
        visibleItemsCount={transactions.length}
      />
    </main>
  );
}