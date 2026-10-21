"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  formatRupiah,
  getMonthNameIndonesian,
  applyTemplate,
  getDefaultKasRtForm,
  findDuplicateTransactions,
} from "@/lib/kas-rt-utils";
import { NO_FILE_SELECTED_LABEL } from "@/lib/kas-rt-constants";

function monthNameFromDate(dateStr: string): string {
  if (!dateStr) return getMonthNameIndonesian(new Date());
  return getMonthNameIndonesian(new Date(dateStr + "T00:00:00"));
}

import type {
  TransactionItem,
  KasRtCategory,
  KasRtFormState,
  DuplicateWarningState,
} from "@/types/kas-rt";

interface UseKasRtNewTransactionOptions {
  categories: KasRtCategory[];
  transactions: TransactionItem[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  refreshData: () => Promise<void>;
}

export interface UseKasRtNewTransactionReturn {
  isOpen: boolean;
  isEditMode: boolean;
  editingTxId: string | null;
  form: KasRtFormState;
  formError: string | null;
  isSubmitting: boolean;
  isIncomeForm: boolean;
  isExpenseForm: boolean;
  visibleCategories: KasRtCategory[];
  isFormValid: boolean;
  placeholderTemplate: { titlePlaceholder: string; detailsPlaceholder: string };

  fileInputRef: React.RefObject<HTMLInputElement>;
  attachmentLabel: string;
  setAttachmentLabel: (v: string) => void;
  hasAttachment: boolean;
  setHasAttachment: (v: boolean) => void;

  duplicateWarning: DuplicateWarningState | null;
  setDuplicateWarning: (v: DuplicateWarningState | null) => void;

  assetId: string;
  assetsList: { id: string; name: string; category_name: string }[];
  isLoadingAssets: boolean;
  setAssetId: (id: string) => void;

  openForm: () => void;
  openEditForm: (tx: TransactionItem) => void;
  closeForm: () => void;
  setType: (type: "income" | "expense") => void;
  setCategoryId: (id: string) => void;
  setAmount: (amount: string) => void;
  setDate: (date: string) => void;
  setReference: (ref: string) => void;
  setTitle: (title: string) => void;
  setDetails: (details: string) => void;
  handleSubmit: () => Promise<void>;
}

export function useKasRtNewTransaction({
  categories,
  transactions,
  setTransactions,
  refreshData,
}: UseKasRtNewTransactionOptions): UseKasRtNewTransactionReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [form, setForm] = useState<KasRtFormState>(() =>
    getDefaultKasRtForm(new Date()),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attachmentLabel, setAttachmentLabel] = useState(NO_FILE_SELECTED_LABEL);
  const [hasAttachment, setHasAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningState | null>(null);

  const [assetId, setAssetId] = useState("");
  const [assetsList, setAssetsList] = useState<{ id: string; name: string; category_name: string }[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const isIncomeForm = form.type === "income";
  const isExpenseForm = form.type === "expense";
  const isEditMode = editingTxId !== null;

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.applies_to === form.type || c.applies_to === "both",
      ),
    [categories, form.type],
  );

  // The form can be opened before the categories have arrived (the page
  // streams them in). Pick the first matching category as soon as they are
  // available so the user does not have to choose one.
  useEffect(() => {
    if (!isOpen || form.categoryId || categories.length === 0) return;
    const firstCategory = categories.find(
      (c) => c.applies_to === form.type || c.applies_to === "both",
    );
    if (!firstCategory) return;
    setForm((prev) => ({ ...prev, categoryId: firstCategory.id }));
  }, [isOpen, form.categoryId, form.type, categories, setForm]);

  const isFormValid = useMemo(() => {
    const amountNumber = Number(form.amount);
    const referenceValid = isIncomeForm ? form.reference.trim().length > 0 : true;
    const titleValid = isEditMode ? form.title.trim().length > 0 : true;
    return (
      form.type.length > 0 &&
      form.categoryId.length > 0 &&
      form.date.length > 0 &&
      referenceValid &&
      !Number.isNaN(amountNumber) &&
      amountNumber > 0 &&
      titleValid
    );
  }, [form, isIncomeForm, isEditMode]);

  const placeholderTemplate = useMemo(() => {
    const selected = categories.find((c) => c.id === form.categoryId);
    if (!selected) return { titlePlaceholder: "", detailsPlaceholder: "" };
    const monthName = monthNameFromDate(form.date);
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
  }, [categories, form.categoryId, form.type, form.reference, form.date]);

  // ── Fetch assets list for expense dropdown ──────────────────────────────
  useEffect(() => {
    if (!isExpenseForm) {
      setAssetsList([]);
      setAssetId("");
      return;
    }
    if (assetsList.length > 0) return;
    let isMounted = true;
    setIsLoadingAssets(true);
    async function fetchAssets() {
      try {
        const res = await apiFetch("/api/asset-rt?limit=200");
        if (!res.ok) return;
        const data = (await res.json()) as { success?: boolean; data?: { assets?: { id: string; name: string; category?: { name: string } | null }[] } };
        if (!isMounted) return;
        if (data.success && data.data?.assets) {
          setAssetsList(
            data.data.assets.map((a) => ({
              id: a.id,
              name: a.name,
              category_name: a.category?.name ?? "",
            })),
          );
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoadingAssets(false);
      }
    }
    void fetchAssets();
    return () => { isMounted = false; };
  }, [isExpenseForm, assetsList.length]);

  const openForm = useCallback(() => {
    setFormError(null);
    setDuplicateWarning(null);
    const defaultForm = getDefaultKasRtForm(new Date());
    const firstCategory = categories.find(
      (c) => c.applies_to === "income" || c.applies_to === "both",
    );
    defaultForm.categoryId = firstCategory?.id ?? "";
    defaultForm.title = "";
    defaultForm.details = "";
    defaultForm.reference = "";
    setForm(defaultForm);
    setEditingTxId(null);
    setAttachmentLabel(NO_FILE_SELECTED_LABEL);
    setHasAttachment(false);
    setAssetId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsOpen(true);
  }, [categories]);

  const openEditForm = useCallback((tx: TransactionItem) => {
    setFormError(null);
    setDuplicateWarning(null);
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
    setAttachmentLabel(NO_FILE_SELECTED_LABEL);
    setHasAttachment(false);
    setAssetId(tx.asset_id ?? "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsOpen(true);
  }, [categories]);

  const closeForm = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
    setEditingTxId(null);
    setFormError(null);
    setDuplicateWarning(null);
  }, [isSubmitting]);

  const setType = useCallback((type: "income" | "expense") => {
    setForm((prev) => {
      const selected = categories.find((c) => c.id === prev.categoryId);
      const stillValid = selected && (selected.applies_to === type || selected.applies_to === "both");
      const firstValid = categories.find(
        (c) => c.applies_to === type || c.applies_to === "both",
      );
      return {
        ...prev,
        type,
        reference: type === "expense" ? "" : prev.reference,
        categoryId: stillValid && selected ? prev.categoryId : (firstValid?.id ?? ""),
        title: "",
        details: "",
      };
    });
  }, [categories]);

  const setCategoryId = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, categoryId: id }));
  }, []);

  const setAmount = useCallback((amount: string) => {
    setForm((prev) => ({ ...prev, amount }));
  }, []);

  const setDate = useCallback((date: string) => {
    setForm((prev) => ({ ...prev, date }));
  }, []);

  const setReference = useCallback((reference: string) => {
    const sanitized = reference.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    setForm((prev) => {
      const updated = { ...prev, reference: sanitized };
      const selected = categories.find((c) => c.id === prev.categoryId);
      if (!selected) return updated;
      const monthName = monthNameFromDate(prev.date);
      const blok = reference.trim() || "-";
      return {
        ...updated,
        title: applyTemplate(selected.title_template, { bulan: monthName, blok }),
        details: applyTemplate(selected.desc_template, { bulan: monthName, blok }),
      };
    });
  }, [categories]);

  const setTitle = useCallback((title: string) => {
    setForm((prev) => ({ ...prev, title }));
  }, []);

  const setDetails = useCallback((details: string) => {
    setForm((prev) => ({ ...prev, details }));
  }, []);

  const performSubmit = useCallback(async () => {
    const amountNumber = Number(form.amount);
    setFormError(null);

    const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
    const ALLOWED_ATTACHMENT_TYPES = [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
      "application/pdf",
    ];
    const rawFiles = fileInputRef.current?.files;
    if (rawFiles && rawFiles.length > 0) {
      for (const file of Array.from(rawFiles)) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setFormError(`Ukuran file ${file.name} melebihi batas maksimal 5MB.`);
          setIsSubmitting(false);
          return;
        }
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
          setFormError(`Tipe file ${file.name} tidak didukung.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const selectedCategory = categories.find((c) => c.id === form.categoryId);
      const categoryName = selectedCategory?.name ?? null;
      let finalTitle = form.title.trim();
      let finalDetails = form.details.trim();

      if (!editingTxId) {
        const monthName = monthNameFromDate(form.date);
        const blok = form.type === "expense" ? "-" : form.reference.trim() || "-";
        finalTitle = finalTitle || (selectedCategory
          ? applyTemplate(selectedCategory.title_template, { bulan: monthName, blok })
          : "");
        finalDetails = finalDetails || (selectedCategory
          ? applyTemplate(selectedCategory.desc_template, { bulan: monthName, blok })
          : "");
      }

      let response: Response;
      const files = fileInputRef.current?.files;
      const filesToUpload = files ? Array.from(files) : [];

      const formData = new FormData();
      formData.append("title", finalTitle);
      formData.append("amount", String(amountNumber));
      formData.append("type", form.type);
      formData.append("date", form.date);
      formData.append("reference", form.reference.trim());
      formData.append("details", finalDetails);
      if (categoryName) formData.append("category", categoryName);
      if (assetId) formData.append("asset_id", assetId);

      if (filesToUpload.length > 0) {
        filesToUpload.forEach((file) => formData.append("attachments", file));
      }

      if (editingTxId) {
        response = await apiFetch(`/api/kas-rt/transactions/${editingTxId}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
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
        } catch { /* ignore */ }
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

      setIsOpen(false);
      setEditingTxId(null);
      setFormError(null);
      setDuplicateWarning(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAttachmentLabel(NO_FILE_SELECTED_LABEL);
      void refreshData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form, editingTxId, categories, assetId,
    setTransactions, refreshData,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    const amountNumber = Number(form.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setFormError("Nominal tidak valid.");
      return;
    }

    setIsSubmitting(true);

    if (!editingTxId && form.type === "income") {
      const matches = findDuplicateTransactions(
        transactions,
        form.date,
        form.reference,
        undefined,
        form.type,
      );
      if (matches.length > 0) {
        setDuplicateWarning({
          matches: matches as TransactionItem[],
          onConfirm: () => {
            setDuplicateWarning(null);
            void performSubmit();
          },
        });
        setIsSubmitting(false);
        return;
      }
    }

    await performSubmit();
  }, [
    form, isFormValid, isSubmitting, editingTxId,
    transactions, performSubmit,
  ]);

  return {
    isOpen,
    isEditMode,
    editingTxId,
    form,
    formError,
    isSubmitting,
    isIncomeForm,
    isExpenseForm,
    visibleCategories,
    isFormValid,
    placeholderTemplate,

    fileInputRef,
    attachmentLabel,
    setAttachmentLabel,
    hasAttachment,
    setHasAttachment,

    duplicateWarning,
    setDuplicateWarning,

    assetId,
    assetsList,
    isLoadingAssets,
    setAssetId,

    openForm,
    openEditForm,
    closeForm,
    setType,
    setCategoryId,
    setAmount,
    setDate,
    setReference,
    setTitle,
    setDetails,
    handleSubmit,
  };
}