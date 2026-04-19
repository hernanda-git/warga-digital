"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { findDuplicateTransactions } from "@/lib/kas-rt-utils";
import { getDefaultFilterDates } from "@/lib/kas-rt-constants";
import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";
import { useKasRtTransactions } from "@/lib/hooks/use-kas-rt-transactions";
import { useKasRtForm } from "@/lib/hooks/use-kas-rt-form";
import {
  KasRtHero,
  KasRtFilterBar,
  KasRtFilterSheet,
  KasRtDownloadSheet,
  KasRtTransactionList,
  KasRtTransactionForm,
  KasRtDeleteConfirmDialog,
  KasRtDuplicateWarningDialog,
} from "@/components/kas-rt";
import { KasRtTransactionListSkeleton } from "@/components/kas-rt/skeletons";
import type { KasRtDownloadState, TransactionItem } from "@/types/kas-rt";
import { toast } from "sonner";

export default function KasRTPage() {
  // Memoize 'now' to prevent unnecessary re-renders
  const now = useMemo(() => new Date(), []);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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

  // ── Transactions hook ──────────────────────────────────────────────────────
  const {
    transactions,
    categories,
    communityName,
    canSubmitTransaction,
    isPageLoading,
    isTransactionsLoading,
    isRefreshing,
    refreshedAt,
    filterState,
    setFilterState,
    isFilterOpen,
    setIsFilterOpen,
    totals,
    filteredTransactions,
    allCategoryNames,
    allBlockNames,
    activeAdvancedFilterCount,
    refreshData,
    loadCategories,
    setTransactions,
    applyFilters,
  } = useKasRtTransactions({ now });

  // ── Edit / delete state ────────────────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
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

  // ── Form state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ── Form hook ──────────────────────────────────────────────────────────────
  const formHook = useKasRtForm({
    categories,
    transactions,
    editingTxId,
    setEditingTxId,
    setTransactions,
    refreshData,
    setIsFormOpen,
  });

  // Close form handler - defined after formHook to avoid circular dependency
  const closeForm = useCallback(() => {
    if (formHook.isSubmitting) return;
    setIsFormOpen(false);
    setEditingTxId(null);
    formHook.resetFormState();
  }, [formHook]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
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

  // ── Duplicate check handler ───────────────────────────────────────────────
  const handleDuplicateCheck = useCallback(() => {
    // Skip duplicate check for expense transactions
    if (formHook.form.type === "expense") {
      formHook.setFormStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }

    // Only check duplicates for income transactions (by blok + date)
    const matches = findDuplicateTransactions(
      transactions,
      formHook.form.date,
      formHook.form.reference,
      editingTxId ?? undefined,
      formHook.form.type,
    );
    if (matches.length > 0) {
      formHook.setDuplicateWarning({
        matches: matches as TransactionItem[],
        onConfirm: () => {
          formHook.setDuplicateWarning(null);
          formHook.setFormStep(3);
        },
      });
      return;
    }
    formHook.setFormStep((s) => (s + 1) as 1 | 2 | 3);
  }, [formHook, transactions, editingTxId]);

  // ── Reset filter handler ──────────────────────────────────────────────────
  const handleResetFilter = useCallback(() => {
    const defaultDates = getDefaultFilterDates(now);
    setFilterState({
      typeFilter: "all",
      categoryFilter: "",
      blockFilter: "",
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
    });
  }, [now, setFilterState]);

  // ── Open form handler ─────────────────────────────────────────────────────

  const handleOpenForm = useCallback(() => {
    formHook.openForm();

    setIsFormOpen(true);
  }, [formHook]);

  // ── Open summary handler ───────────────────────────────────────────────────
  const handleOpenSummary = useCallback(() => {
    router.push("/kas-rt/summary");
  }, [router]);

  // ── Open house status handler ──────────────────────────────────────────────
  const handleOpenHouseStatus = useCallback(() => {
    router.push("/kas-rt/house-status");
  }, [router]);

  // ── Open edit form handler ────────────────────────────────────────────────
  const handleOpenEditForm = useCallback(
    (tx: TransactionItem) => {
      formHook.openEditForm(tx);
      setIsFormOpen(true);
    },
    [formHook],
  );

  // ── Remove attachment handler ─────────────────────────────────────────────
  const handleRemoveAttachment = useCallback(
    async (attachmentId: string) => {
      if (!editingTxId) return;
      try {
        const res = await apiFetch(
          `/api/kas-rt/transactions/${editingTxId}/attachments?attachmentIds=${attachmentId}`,
          {
            method: "DELETE",
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Gagal menghapus lampiran.");
        }
        // Update the transaction in the local state
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTxId
              ? {
                  ...t,
                  attachments: t.attachments.filter((a) => a.id !== attachmentId),
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
    [editingTxId, setTransactions],
  );

  // ── Loading state - Show spinner while loading essential data ─────────────
  if (isPageLoading) {
    return <PageLoader message="Memuat kas RT..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* Scrollable container */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Hero section */}

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

        {/* Filter bar */}
        <KasRtFilterBar
          typeFilter={filterState.typeFilter}
          setTypeFilter={(type) =>
            setFilterState((prev) => ({ ...prev, typeFilter: type }))
          }
          activeAdvancedFilterCount={activeAdvancedFilterCount}
          onOpenFilter={() => setIsFilterOpen(true)}
        />

        {/* Transaction list - show skeleton while loading, then actual list */}
        {isTransactionsLoading ? (
          <KasRtTransactionListSkeleton count={5} />
        ) : (
          <KasRtTransactionList
            transactions={transactions}
            filteredTransactions={filteredTransactions}
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
          />
        )}
      </div>

      {/* Filter bottom sheet */}
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

      {/* Download bottom sheet */}
      <KasRtDownloadSheet
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        downloadState={downloadState}
        setDownloadState={setDownloadState}
        allCategoryNames={allCategoryNames}
        isDownloading={isDownloading}
        downloadError={downloadError}
        onDownload={handleDownloadReport}
      />

      {/* Transaction form bottom sheet */}
      <KasRtTransactionForm
        isOpen={isFormOpen}
        onClose={closeForm}
        editingTxId={editingTxId}
        editingTxAttachments={
          editingTxId
            ? transactions.find((t) => t.id === editingTxId)?.attachments ?? null
            : null
        }
        form={formHook.form}
        formStep={formHook.formStep}
        isSubmitting={formHook.isSubmitting}
        formError={formHook.formError}
        isIncomeForm={formHook.isIncomeForm}
        isExpenseForm={formHook.isExpenseForm}
        visibleCategories={formHook.visibleCategories}
        isStep1Valid={formHook.isStep1Valid}
        isStep2Valid={formHook.isStep2Valid}
        isFormValid={formHook.isFormValid}
        fileInputRef={formHook.fileInputRef}
        attachmentLabel={formHook.attachmentLabel}
        setAttachmentLabel={formHook.setAttachmentLabel}
        hasAttachment={formHook.hasAttachment}
        setHasAttachment={formHook.setHasAttachment}
        categoryDetails={formHook.categoryDetails}
        defaultJumlahWarga={formHook.defaultJumlahWarga}
        jumlahWarga={formHook.jumlahWarga}
        setJumlahWarga={formHook.setJumlahWarga}
        useAutoCalculate={formHook.useAutoCalculate}
        setUseAutoCalculate={formHook.setUseAutoCalculate}
        isLoadingCategoryDetails={formHook.isLoadingCategoryDetails}
        expenseBreakdown={formHook.expenseBreakdown}
        handleCategoryChange={formHook.handleCategoryChange}
        handleTypeChange={formHook.handleTypeChange}
        updateFormField={formHook.updateFormField}
        setFormStep={formHook.setFormStep}
        handleSubmit={formHook.handleSubmit}
        onDuplicateCheck={handleDuplicateCheck}
        placeholderTemplate={formHook.placeholderTemplate}
        onRemoveAttachment={handleRemoveAttachment}
      />

      {/* Duplicate warning dialog */}
      <KasRtDuplicateWarningDialog
        duplicateWarning={formHook.duplicateWarning}
        formReference={formHook.form.reference}
        onClose={() => formHook.setDuplicateWarning(null)}
      />

      {/* Delete confirmation dialog */}
      <KasRtDeleteConfirmDialog
        deletingTx={deletingTx}
        isDeleteConfirming={isDeleteConfirming}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteTx}
      />
    </main>
  );
}
