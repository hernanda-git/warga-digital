"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  formatRupiah,
  getMonthNameIndonesian,
  applyTemplate,
  getDefaultKasRtForm,
  calculateExpenseBreakdown,
  findDuplicateTransactions,
} from "@/lib/kas-rt-utils";
import { NO_FILE_SELECTED_LABEL } from "@/lib/kas-rt-constants";
import type {
  TransactionItem,
  KasRtCategory,
  KasRtFormState,
  CategoryDetail,
  ExpenseBreakdown,
  DuplicateWarningState,
} from "@/types/kas-rt";

interface UseKasRtFormOptions {
  categories: KasRtCategory[];
  transactions: TransactionItem[];
  editingTxId: string | null;
  setEditingTxId: React.Dispatch<React.SetStateAction<string | null>>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  refreshData: () => Promise<void>;
  setIsFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseKasRtFormReturn {
  // Form state
  form: KasRtFormState;
  setForm: React.Dispatch<React.SetStateAction<KasRtFormState>>;
  formStep: 1 | 2 | 3;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  isSubmitting: boolean;
  formError: string | null;
  setFormError: React.Dispatch<React.SetStateAction<string | null>>;

  // File attachment
  fileInputRef: React.RefObject<HTMLInputElement>;
  attachmentLabel: string;
  setAttachmentLabel: React.Dispatch<React.SetStateAction<string>>;
  hasAttachment: boolean;
  setHasAttachment: React.Dispatch<React.SetStateAction<boolean>>;

  // Category details for expense auto-calculation
  categoryDetails: CategoryDetail[];
  setCategoryDetails: React.Dispatch<React.SetStateAction<CategoryDetail[]>>;
  defaultJumlahWarga: number;
  setDefaultJumlahWarga: React.Dispatch<React.SetStateAction<number>>;
  jumlahWarga: string;
  setJumlahWarga: React.Dispatch<React.SetStateAction<string>>;
  useAutoCalculate: boolean;
  setUseAutoCalculate: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingCategoryDetails: boolean;
  expenseBreakdown: ExpenseBreakdown | null;

  // Duplicate warning
  duplicateWarning: DuplicateWarningState | null;
  setDuplicateWarning: React.Dispatch<
    React.SetStateAction<DuplicateWarningState | null>
  >;

  // Derived
  isIncomeForm: boolean;
  isExpenseForm: boolean;
  visibleCategories: KasRtCategory[];
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  isFormValid: boolean;
  placeholderTemplate: { titlePlaceholder: string; detailsPlaceholder: string };

  // Actions
  handleCategoryChange: (categoryId: string) => void;
  handleTypeChange: (type: "income" | "expense") => void;
  updateFormField: <K extends keyof KasRtFormState>(
    key: K,
    value: KasRtFormState[K],
  ) => void;
  reApplyTemplatesWithBlok: () => void;
  resetFormState: () => void;
  openForm: () => void;
  openEditForm: (tx: TransactionItem) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteTx: (deletingTx: TransactionItem | null) => Promise<void>;
}

/**
 * Hook for managing Kas RT transaction form state and submission
 */
export function useKasRtForm({
  categories,
  transactions,
  editingTxId,
  setEditingTxId,
  setTransactions,
  refreshData,
  setIsFormOpen,
}: UseKasRtFormOptions): UseKasRtFormReturn {
  // ── Form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState<KasRtFormState>(() =>
    getDefaultKasRtForm(new Date()),
  );
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentLabel, setAttachmentLabel] = useState(
    NO_FILE_SELECTED_LABEL,
  );
  const [hasAttachment, setHasAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Category details for expense auto-calculation ─────────────────────
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetail[]>([]);
  const [defaultJumlahWarga, setDefaultJumlahWarga] = useState<number>(0);
  const [jumlahWarga, setJumlahWarga] = useState<string>("");
  const [useAutoCalculate, setUseAutoCalculate] = useState(true);
  const [isLoadingCategoryDetails, setIsLoadingCategoryDetails] =
    useState(false);

  // ── Duplicate warning ─────────────────────────────────────────────────
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateWarningState | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────
  const isIncomeForm = form.type === "income";
  const isExpenseForm = form.type === "expense";

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.applies_to === form.type || c.applies_to === "both",
      ),
    [categories, form.type],
  );

  const isStep1Valid =
    (form.type === "income" || form.type === "expense") &&
    form.categoryId.length > 0;

  const isStep2Valid = useMemo(() => {
    const amountNumber = Number(form.amount);
    // Reference (Blok) is required only for income transactions
    const referenceValid = isIncomeForm
      ? form.reference.trim().length > 0
      : true;
    return (
      form.date.length > 0 &&
      referenceValid &&
      !Number.isNaN(amountNumber) &&
      amountNumber > 0
    );
  }, [form.amount, form.date, form.reference, isIncomeForm]);

  const isStep3Valid = useMemo(() => {
    // Title and details are optional — they are auto-filled from category
    // template at submit time if left empty. Only attachment is conditionally required.
    const attachmentRequired = isExpenseForm && !editingTxId;
    const attachmentValid = attachmentRequired ? hasAttachment : true;
    return attachmentValid;
  }, [isExpenseForm, editingTxId, hasAttachment]);

  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  // ── Expense breakdown calculation ─────────────────────────────────────
  const expenseBreakdown = useMemo<ExpenseBreakdown | null>(() => {
    if (form.type !== "expense" || categoryDetails.length === 0) {
      return null;
    }

    const jumlah = Number(jumlahWarga) || 0;
    const { items, total } = calculateExpenseBreakdown(categoryDetails, jumlah);

    return { items, total, jumlahWarga: jumlah };
  }, [form.type, categoryDetails, jumlahWarga]);

  // ── Auto-fill amount when breakdown changes ───────────────────────────
  useEffect(() => {
    if (
      form.type === "expense" &&
      useAutoCalculate &&
      expenseBreakdown &&
      expenseBreakdown.total > 0
    ) {
      setForm((prev) => ({
        ...prev,
        amount: String(expenseBreakdown.total),
      }));
    }
  }, [form.type, useAutoCalculate, expenseBreakdown]);

  // ── Fetch category details when expense category is selected ──────────
  useEffect(() => {
    if (form.type !== "expense" || !form.categoryId) {
      setCategoryDetails([]);
      setDefaultJumlahWarga(0);
      setJumlahWarga("");
      return;
    }

    let isMounted = true;
    setIsLoadingCategoryDetails(true);

    async function fetchCategoryDetails() {
      try {
        const response = await apiFetch(
          `/api/kas-rt/category-details?category_id=${form.categoryId}`,
        );
        if (!response.ok) {
          if (isMounted) {
            setCategoryDetails([]);
            setDefaultJumlahWarga(0);
            setJumlahWarga("");
          }
          return;
        }
        const data = (await response.json()) as {
          details: CategoryDetail[];
          defaultJumlahWarga?: number;
        };
        if (isMounted) {
          const activeDetails = (data.details || []).filter((d) => d.is_active);
          setCategoryDetails(activeDetails);
          const defaultCount = data.defaultJumlahWarga || 0;
          setDefaultJumlahWarga(defaultCount);
          setJumlahWarga(String(defaultCount));
        }
      } catch {
        if (isMounted) {
          setCategoryDetails([]);
          setDefaultJumlahWarga(0);
          setJumlahWarga("");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategoryDetails(false);
        }
      }
    }

    void fetchCategoryDetails();
    return () => {
      isMounted = false;
    };
  }, [form.type, form.categoryId]);

  // ── Form handlers ─────────────────────────────────────────────────────
  const handleCategoryChange = useCallback((categoryId: string) => {
    // Just set the categoryId - don't pre-fill title/details
    // Templates will be applied at submit time if user leaves fields empty
    setForm((prev) => ({ ...prev, categoryId: categoryId }));
    // Reset category details when category changes
    setCategoryDetails([]);
    setDefaultJumlahWarga(0);
    setJumlahWarga("");
    setUseAutoCalculate(true);
  }, []);

  const handleTypeChange = useCallback(
    (type: "income" | "expense") => {
      setForm((prev) => {
        const selected = categories.find((c) => c.id === prev.categoryId);
        const stillValid =
          selected &&
          (selected.applies_to === type || selected.applies_to === "both");

        // Clear reference when switching to expense, keep it for income
        const newReference = type === "expense" ? "" : prev.reference;

        // Don't pre-fill title/details - leave empty for user to fill
        // Template will be applied at submit time if empty
        if (stillValid && selected) {
          return {
            ...prev,
            type,
            reference: newReference,
            title: "",
            details: "",
          };
        }

        return {
          ...prev,
          type,
          categoryId: "",
          reference: newReference,
          title: "",
          details: "",
        };
      });
      // Reset category details when type changes
      setCategoryDetails([]);
      setDefaultJumlahWarga(0);
      setJumlahWarga("");
      setUseAutoCalculate(true);
    },
    [categories],
  );

  const reApplyTemplatesWithBlok = useCallback(() => {
    // Placeholder templates are computed reactively in placeholderTemplate
  }, []);

  const openForm = useCallback(() => {
    setFormError(null);
    const defaultForm = getDefaultKasRtForm(new Date());
    // Don't pre-fill title/details - leave empty for user to fill
    // Template will be applied at submit time if empty
    defaultForm.categoryId = "";
    defaultForm.title = "";
    defaultForm.details = "";
    // Clear reference for new forms (will be filled for income, left empty for expense)
    defaultForm.reference = "";
    setForm(defaultForm);
    setFormStep(1);
    // Reset category details state
    setCategoryDetails([]);
    setDefaultJumlahWarga(0);
    setJumlahWarga("");
    setUseAutoCalculate(true);
  }, []);

  const openEditForm = useCallback(
    (tx: TransactionItem) => {
      setFormError(null);
      setEditingTxId(tx.id);
      const matchingCategory = categories.find((c) => c.name === tx.category);
      setForm({
        type: tx.type,
        categoryId: matchingCategory?.id ?? "",
        amount: String(tx.amount),
        date: tx.date,
        reference: tx.reference ?? "",
        title: tx.title,
        details: tx.details ?? "",
      });
      setFormStep(1);
    },
    [categories, setEditingTxId],
  );

  const updateFormField = useCallback(
    <K extends keyof KasRtFormState>(key: K, value: KasRtFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Reset form state ──────────────────────────────────────────────────
  const resetFormState = useCallback(() => {
    setCategoryDetails([]);
    setDefaultJumlahWarga(0);
    setJumlahWarga("");
    setUseAutoCalculate(true);
  }, []);

  // ── Submit handler ────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isFormValid || isSubmitting) return;

      const amountNumber = Number(form.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        setFormError("Nominal tidak valid.");
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        const selectedCategory = categories.find(
          (c) => c.id === form.categoryId,
        );
        const categoryName = selectedCategory?.name ?? null;

        // Apply template at submit time if title/details are empty
        const monthName = getMonthNameIndonesian(new Date());
        const blok =
          form.type === "expense" ? "-" : form.reference.trim() || "-";

        const finalTitle =
          form.title.trim() ||
          (selectedCategory
            ? applyTemplate(selectedCategory.title_template, {
                bulan: monthName,
                blok,
              })
            : "");
        const finalDetails =
          form.details.trim() ||
          (selectedCategory
            ? applyTemplate(selectedCategory.desc_template, {
                bulan: monthName,
                blok,
              })
            : "");

        let response: Response;

        if (editingTxId) {
          response = await apiFetch(`/api/kas-rt/transactions/${editingTxId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: finalTitle,
              amount: amountNumber,
              type: form.type,
              date: form.date,
              reference: form.reference.trim() || null,
              details: finalDetails,
              category: categoryName,
            }),
          });
        } else {
          const formData = new FormData();
          formData.append("title", finalTitle);
          formData.append("amount", String(amountNumber));
          formData.append("type", form.type);
          formData.append("date", form.date);
          formData.append("reference", form.reference.trim());
          formData.append("details", finalDetails);
          if (categoryName) formData.append("category", categoryName);

          // Include transaction details for expense with auto-calculate
          if (
            form.type === "expense" &&
            useAutoCalculate &&
            expenseBreakdown &&
            expenseBreakdown.items.length > 0
          ) {
            const transactionDetails = expenseBreakdown.items.map((item) => ({
              name: item.name,
              rate_per_warga: item.rate,
              jumlah_warga: expenseBreakdown.jumlahWarga,
              subtotal: item.amount,
            }));
            formData.append(
              "transaction_details",
              JSON.stringify(transactionDetails),
            );
          }

          const files = fileInputRef.current?.files;
          if (files && files.length) {
            Array.from(files).forEach((file) => {
              formData.append("attachments", file);
            });
          }
          response = await apiFetch("/api/kas-rt/transactions", {
            method: "POST",
            body: formData,
          });
        }

        if (!response.ok) {
          let message = "Gagal menyimpan transaksi.";
          try {
            const data = (await response.json()) as { message?: string };
            if (data?.message) message = data.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const created = (await response.json()) as TransactionItem;

        if (editingTxId) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === created.id ? { ...t, ...created } : t)),
          );
          toast.success("Transaksi berhasil diperbarui.");
        } else {
          setTransactions((prev) => [created, ...prev]);
          toast.success("Transaksi kas RT berhasil disimpan.");
        }

        setForm(getDefaultKasRtForm(new Date()));
        if (fileInputRef.current) fileInputRef.current.value = "";
        setAttachmentLabel(NO_FILE_SELECTED_LABEL);
        setFormStep(1);
        setEditingTxId(null);
        setIsFormOpen(false);
        void refreshData();
      } catch (error) {
        if (error instanceof Error) {
          setFormError(error.message);
        } else {
          setFormError("Terjadi kesalahan saat menyimpan.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form,
      isFormValid,
      isSubmitting,
      categories,
      editingTxId,
      useAutoCalculate,
      expenseBreakdown,
      setTransactions,
      refreshData,
      setEditingTxId,
      setIsFormOpen,
    ],
  );

  const handleDeleteTx = useCallback(
    async (deletingTx: TransactionItem | null) => {
      if (!deletingTx) return;
      try {
        const res = await apiFetch(
          `/api/kas-rt/transactions/${deletingTx.id}`,
          {
            method: "DELETE",
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          toast.error(body.message ?? "Gagal menghapus transaksi.");
          return;
        }
        setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
        toast.success(`Transaksi "${deletingTx.title}" berhasil dihapus.`);
      } catch {
        toast.error("Gagal terhubung ke server.");
      }
    },
    [setTransactions],
  );

  // Compute placeholder template based on selected category
  const placeholderTemplate = useMemo(() => {
    const selected = categories.find((c) => c.id === form.categoryId);
    if (!selected) return { titlePlaceholder: "", detailsPlaceholder: "" };
    const monthName = getMonthNameIndonesian(new Date());
    const blok = form.type === "expense" ? "-" : form.reference.trim() || "-";
    return {
      titlePlaceholder: applyTemplate(selected.title_template, {
        bulan: monthName,
        blok,
      }),
      detailsPlaceholder: applyTemplate(selected.desc_template, {
        bulan: monthName,
        blok,
      }),
    };
  }, [categories, form.categoryId, form.type, form.reference]);

  return {
    // Form state
    form,
    setForm,
    formStep,
    setFormStep,
    isSubmitting,
    formError,
    setFormError,

    // File attachment
    fileInputRef,
    attachmentLabel,
    setAttachmentLabel,
    hasAttachment,
    setHasAttachment,

    // Category details for expense auto-calculation
    categoryDetails,
    setCategoryDetails,
    defaultJumlahWarga,
    setDefaultJumlahWarga,
    jumlahWarga,
    setJumlahWarga,
    useAutoCalculate,
    setUseAutoCalculate,
    isLoadingCategoryDetails,
    expenseBreakdown,

    // Duplicate warning
    duplicateWarning,
    setDuplicateWarning,

    // Derived
    isIncomeForm,
    isExpenseForm,
    visibleCategories,
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isFormValid,
    placeholderTemplate,

    // Actions
    handleCategoryChange,
    handleTypeChange,
    updateFormField,
    reApplyTemplatesWithBlok,
    resetFormState,
    openForm,
    openEditForm,
    handleSubmit,
    handleDeleteTx,
  };
}
