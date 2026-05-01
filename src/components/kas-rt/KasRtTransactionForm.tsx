"use client";

import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  formatRupiah,
  formatAmountDisplay,
  parseAmountInput,
  applyFocusRing,
  clearFocusRing,
} from "@/lib/kas-rt-utils";
import { TRANSACTION_TYPE_OPTIONS } from "@/lib/kas-rt-constants";
import type {
  KasRtCategory,
  KasRtFormState,
  CategoryDetail,
  ExpenseBreakdown,
} from "@/types/kas-rt";

interface PlaceholderTemplate {
  titlePlaceholder: string;
  detailsPlaceholder: string;
}

interface KasRtTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTxId: string | null;
  editingTxAttachments?: import("@/types/kas-rt").TransactionAttachment[] | null;
  form: KasRtFormState;
  formStep: 1 | 2 | 3;
  isSubmitting: boolean;
  formError: string | null;
  isIncomeForm: boolean;
  isExpenseForm: boolean;
  visibleCategories: KasRtCategory[];
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isFormValid: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  attachmentLabel: string;
  setAttachmentLabel: React.Dispatch<React.SetStateAction<string>>;
  hasAttachment: boolean;
  setHasAttachment: React.Dispatch<React.SetStateAction<boolean>>;
  categoryDetails: CategoryDetail[];
  defaultJumlahWarga: number;
  jumlahWarga: string;
  setJumlahWarga: React.Dispatch<React.SetStateAction<string>>;
  useAutoCalculate: boolean;
  setUseAutoCalculate: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingCategoryDetails: boolean;
  expenseBreakdown: ExpenseBreakdown | null;
  handleCategoryChange: (categoryId: string) => void;
  handleTypeChange: (type: "income" | "expense") => void;
  updateFormField: <K extends keyof KasRtFormState>(
    key: K,
    value: KasRtFormState[K],
  ) => void;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDuplicateCheck: () => void;
  placeholderTemplate: PlaceholderTemplate;
  onRemoveAttachment?: (attachmentId: string) => void;
}

export function KasRtTransactionForm(props: KasRtTransactionFormProps) {
  const {
    isOpen,
    onClose,
    editingTxId,
    editingTxAttachments,
    form,
    formStep,
    isSubmitting,
    formError,
    isIncomeForm,
    isExpenseForm,
    visibleCategories,
    isStep1Valid,
    isStep2Valid,
    isFormValid,
    fileInputRef,
    attachmentLabel,
    setAttachmentLabel,
    hasAttachment,
    setHasAttachment,
    categoryDetails,
    defaultJumlahWarga,
    jumlahWarga,
    setJumlahWarga,
    useAutoCalculate,
    setUseAutoCalculate,
    isLoadingCategoryDetails,
    expenseBreakdown,
    handleCategoryChange,
    handleTypeChange,
    updateFormField,
    setFormStep,
    handleSubmit,
    onDuplicateCheck,
    placeholderTemplate,
    onRemoveAttachment,
  } = props;

  if (!isOpen) return null;

  const stepButtonStyle = (step: 1 | 2 | 3) => ({
    background:
      formStep >= step
        ? isIncomeForm
          ? "var(--color-primary)"
          : "#dc2626"
        : "var(--color-input-border)",
  });

  const nextButtonDisabled =
    (formStep === 1 && !isStep1Valid) || (formStep === 2 && !isStep2Valid);

  const actionButtonStyle = (disabled: boolean) => ({
    background: disabled
      ? "var(--color-body-muted)"
      : isIncomeForm
        ? "var(--color-primary)"
        : "#dc2626",
    boxShadow:
      disabled || !isIncomeForm
        ? "none"
        : "0 8px 22px -12px var(--color-primary-shadow)",
  });

  const handleNextStep = () => {
    if (formStep === 2) {
      onDuplicateCheck();
    } else {
      setFormStep((s) => (s + 1) as 1 | 2 | 3);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kas-rt-form-title"
      >
        <div className="flex justify-center pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>
        <div className="px-5 pb-8 pt-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                id="kas-rt-form-title"
                className="text-lg font-extrabold text-app-title"
              >
                {editingTxId ? "Edit Transaksi" : "Catat Transaksi"}
              </h2>
              {!editingTxId && (
                <p className="mt-0.5 text-xs text-app-body-muted">
                  Langkah {formStep} dari 3
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
              aria-label="Tutup form"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" />
            </button>
          </div>
          {!editingTxId && (
            <div className="mb-5 flex gap-2">
              {([1, 2, 3] as const).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFormStep(step)}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={stepButtonStyle(step)}
                  aria-label={`Langkah ${step}`}
                />
              ))}
            </div>
          )}
          {editingTxId && (
            <div className="mb-5 flex gap-2">
              {([1, 2] as const).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFormStep(step)}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={stepButtonStyle(step)}
                  aria-label={`Langkah ${step}`}
                />
              ))}
            </div>
          )}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {editingTxId ? (
              <>
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Judul Transaksi{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) =>
                          updateFormField("title", e.target.value)
                        }
                        placeholder="Masukkan judul transaksi"
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Deskripsi{" "}
                        <span className="font-normal normal-case text-app-body-muted/70">
                          (opsional)
                        </span>
                      </label>
                      <textarea
                        value={form.details}
                        onChange={(e) =>
                          updateFormField("details", e.target.value)
                        }
                        rows={3}
                        placeholder="Catatan, rincian, dll."
                        className="w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Jumlah{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <div
                        className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all"
                        style={{ borderColor: "var(--color-input-border)" }}
                      >
                        <span className="text-sm font-bold text-app-body-muted">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatAmountDisplay(form.amount)}
                          onChange={(e) =>
                            updateFormField(
                              "amount",
                              parseAmountInput(e.target.value),
                            )
                          }
                          className="flex-1 bg-transparent text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none"
                          placeholder="0"
                          autoFocus
                          onFocus={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) applyFocusRing(parent as HTMLElement);
                          }}
                          onBlur={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) clearFocusRing(parent as HTMLElement);
                          }}
                        />
                      </div>
                    </div>
                    {form.type === "income" && (
                      <div>
                        <label
                          htmlFor="edit-reference"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                        >
                          Blok{" "}
                          <span className="font-normal normal-case text-red-500">
                            *
                          </span>
                        </label>
                        <input
                          id="edit-reference"
                          type="text"
                          value={form.reference}
                          onChange={(e) =>
                            updateFormField("reference", e.target.value)
                          }
                          placeholder="Contoh: N2"
                          maxLength={20}
                          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                          style={{ borderColor: "var(--color-input-border)" }}
                          onFocus={(e) => applyFocusRing(e.currentTarget)}
                          onBlur={(e) => clearFocusRing(e.currentTarget)}
                        />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="edit-date"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Tanggal{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        id="edit-date"
                        type="date"
                        value={form.date}
                        onChange={(e) => updateFormField("date", e.target.value)}
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    {formError && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-[13px] text-red-600">{formError}</p>
                      </div>
                    )}
                  </div>
                )}
                {formStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Lampiran Existing ({editingTxAttachments?.length ?? 0})
                      </p>
                      {editingTxAttachments && editingTxAttachments.length > 0 ? (
                        <div className="space-y-2">
                          {editingTxAttachments.map((att) => {
                            const isImage = att.mime_type?.startsWith("image/");
                            return (
                              <div
                                key={att.id || att.url}
                                className="flex items-center gap-2 rounded-xl bg-app-surface-alt p-2"
                              >
                                {isImage && att.url ? (
                                  <img
                                    src={att.url}
                                    alt={att.file_name}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-primary-muted">
                                    <span className="text-lg">📄</span>
                                  </div>
                                )}
                                <span className="flex-1 truncate text-xs text-app-body">
                                  {att.file_name}
                                </span>
                                {onRemoveAttachment && att.id && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveAttachment(att.id!)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 active:scale-90"
                                    aria-label={`Hapus ${att.file_name}`}
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-app-body-muted">
                          Belum ada lampiran
                        </p>
                      )}
                    </div>
                    <div>
                       <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                         Tambah Lampiran Baru
                       </p>
                       <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3">
                         <input
                           ref={fileInputRef}
                           type="file"
                           multiple
                           onChange={(e) => {
                             const files = e.target.files;
                             if (!files?.length) {
                               setAttachmentLabel("Belum ada file dipilih");
                               setHasAttachment(false);
                             } else if (files.length === 1) {
                               setAttachmentLabel(files[0].name);
                               setHasAttachment(true);
                             } else {
                               setAttachmentLabel(
                                 `${files.length} file dipilih`,
                               );
                               setHasAttachment(true);
                             }
                           }}
                           className="absolute h-0 w-0 opacity-0"
                           id="kas-rt-attachment-input-edit"
                         />
                         <label
                           htmlFor="kas-rt-attachment-input-edit"
                          className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold text-white transition active:scale-90"
                          style={{ background: "var(--color-primary)" }}
                        >
                          Pilih File
                        </label>
                        <span className="flex-1 truncate text-xs text-app-body-muted">
                          {attachmentLabel}
                        </span>
                      </div>
                      {hasAttachment && attachmentLabel !== "Belum ada file dipilih" && (
                        <div className="mt-2 text-[10px] text-app-body-muted">
                          ✓ {attachmentLabel} akan diupload
                        </div>
                      )}
                    </div>
                    {formError && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-[13px] text-red-600">{formError}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      formStep > 1
                        ? setFormStep((s) => (s - 1) as 1 | 2 | 3)
                        : onClose()
                    }
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
                    style={{ background: "var(--color-surface-alt)" }}
                  >
                    {formStep > 1 ? "Kembali" : "Batal"}
                  </button>
                  {formStep === 1 ? (
                    <button
                      type="button"
                      disabled={!isStep2Valid || isSubmitting}
                      onClick={() => setFormStep(2)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(!isStep2Valid || isSubmitting)}
                    >
                      Lanjut
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isStep2Valid || isSubmitting}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(!isStep2Valid || isSubmitting)}
                    >
                      {isSubmitting ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Jenis Transaksi
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {TRANSACTION_TYPE_OPTIONS.map(({ value, label }) => {
                          const active = form.type === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                handleTypeChange(value as "income" | "expense")
                              }
                              className={`rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${active ? "text-white shadow-sm" : "bg-white text-app-body-muted"}`}
                              style={
                                active
                                  ? value === "income"
                                    ? {
                                        background: "rgba(13, 148, 136, 0.15)",
                                        borderColor: "rgba(13, 148, 136, 0.3)",
                                        color: "var(--color-primary)",
                                      }
                                    : {
                                        background: "rgba(220, 38, 38, 0.15)",
                                        borderColor: "rgba(220, 38, 38, 0.3)",
                                        color: "#dc2626",
                                      }
                                  : { borderColor: "var(--color-input-border)" }
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Kategori{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </p>
                      {visibleCategories.length === 0 ? (
                        <div className="animate-pulse rounded-2xl bg-app-surface-alt p-8" />
                      ) : (
                        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto">
                          {visibleCategories.map((cat) => {
                            const isSelected = form.categoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleCategoryChange(cat.id)}
                                className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97] ${isSelected ? "text-white shadow-sm" : "bg-white text-app-body"}`}
                                style={
                                  isSelected
                                    ? isIncomeForm
                                      ? {
                                          background:
                                            "var(--color-primary-light, rgba(13, 148, 136, 0.15))",
                                          borderColor:
                                            "var(--color-primary-light, rgba(13, 148, 136, 0.3))",
                                          color: "var(--color-primary)",
                                        }
                                      : {
                                          background: "rgba(220, 38, 38, 0.15)",
                                          borderColor: "rgba(220, 38, 38, 0.3)",
                                          color: "#dc2626",
                                        }
                                    : {
                                        borderColor:
                                          "var(--color-input-border)",
                                      }
                                }
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {formStep === 2 && (
                  <div className="space-y-4">
                    {form.type === "expense" && categoryDetails.length > 0 && (
                      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                        {isLoadingCategoryDetails ? (
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 w-24 rounded bg-red-200/50" />
                            <div className="h-10 w-full rounded bg-red-200/50" />
                            <div className="h-20 w-full rounded bg-red-200/50" />
                          </div>
                        ) : (
                          <>
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                                Hitung Otomatis
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setUseAutoCalculate(!useAutoCalculate)
                                }
                                className={`flex h-6 w-11 items-center rounded-full transition-colors ${useAutoCalculate ? "bg-red-500" : "bg-gray-300"}`}
                              >
                                <span
                                  className={`h-5 w-5 transform rounded-full bg-white shadow transition-transform ${useAutoCalculate ? "translate-x-5" : "translate-x-0.5"}`}
                                />
                              </button>
                            </div>
                            {useAutoCalculate && expenseBreakdown && (
                              <>
                                <div className="mb-3">
                                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-app-body-muted">
                                    Jumlah Warga
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={jumlahWarga}
                                    onChange={(e) =>
                                      setJumlahWarga(e.target.value)
                                    }
                                    min={0}
                                    className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-app-title focus:outline-none focus:ring-2 focus:ring-red-300"
                                    placeholder="0"
                                  />
                                  {defaultJumlahWarga > 0 && (
                                    <p className="mt-1 text-[10px] text-app-body-muted">
                                      Default: {defaultJumlahWarga} warga aktif
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {expenseBreakdown.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-app-body">
                                          {item.name}
                                        </p>
                                        <p className="text-[10px] text-app-body-muted">
                                          {formatRupiah(item.rate)} ×{" "}
                                          {expenseBreakdown.jumlahWarga} warga
                                        </p>
                                      </div>
                                      <p className="ml-2 shrink-0 text-xs font-bold text-red-600">
                                        {formatRupiah(item.amount)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-red-200 pt-3">
                                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                                    Total
                                  </p>
                                  <p className="text-sm font-extrabold text-red-600">
                                    {formatRupiah(expenseBreakdown.total)}
                                  </p>
                                </div>
                              </>
                            )}
                            {!useAutoCalculate && (
                              <p className="text-xs text-app-body-muted">
                                Mode manual aktif. Isi jumlah secara manual di
                                bawah.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Jumlah{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <div
                        className={`flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all ${form.type === "expense" && useAutoCalculate && categoryDetails.length > 0 ? "opacity-60" : ""}`}
                        style={{ borderColor: "var(--color-input-border)" }}
                      >
                        <span className="text-sm font-bold text-app-body-muted">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatAmountDisplay(form.amount)}
                          onChange={(e) =>
                            updateFormField(
                              "amount",
                              parseAmountInput(e.target.value),
                            )
                          }
                          className="flex-1 bg-transparent text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none"
                          placeholder="0"
                          disabled={
                            form.type === "expense" &&
                            useAutoCalculate &&
                            categoryDetails.length > 0
                          }
                          onFocus={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) applyFocusRing(parent as HTMLElement);
                          }}
                          onBlur={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) clearFocusRing(parent as HTMLElement);
                          }}
                        />
                      </div>
                      {form.type === "expense" &&
                        useAutoCalculate &&
                        categoryDetails.length > 0 && (
                          <p className="mt-1 text-[10px] text-app-body-muted">
                            Jumlah diisi otomatis dari perhitungan di atas
                          </p>
                        )}
                    </div>
                    <div>
                      <label
                        htmlFor="form-date"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Tanggal{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        id="form-date"
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          updateFormField("date", e.target.value)
                        }
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    {isIncomeForm && (
                      <div>
                        <label
                          htmlFor="form-reference"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                        >
                          Blok{" "}
                          <span className="font-normal normal-case text-red-500">
                            *
                          </span>
                        </label>
                        <input
                          id="form-reference"
                          type="text"
                          value={form.reference}
                          onChange={(e) =>
                            updateFormField("reference", e.target.value)
                          }
                          placeholder="Contoh: N2"
                          maxLength={20}
                          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                          style={{ borderColor: "var(--color-input-border)" }}
                          onFocus={(e) => applyFocusRing(e.currentTarget)}
                          onBlur={(e) => clearFocusRing(e.currentTarget)}
                        />
                      </div>
                    )}
                  </div>
                )}
                {formStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="form-title"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Judul Transaksi{" "}
                      </label>
                      <input
                        id="form-title"
                        type="text"
                        value={form.title}
                        onChange={(e) =>
                          updateFormField("title", e.target.value)
                        }
                        placeholder={
                          placeholderTemplate.titlePlaceholder ||
                          "Contoh: IPL Bulan Juni"
                        }
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="form-details"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Deskripsi{" "}
                        <span className="font-normal normal-case text-app-body-muted/70">
                          (opsional)
                        </span>
                      </label>
                      <textarea
                        id="form-details"
                        value={form.details}
                        onChange={(e) =>
                          updateFormField("details", e.target.value)
                        }
                        rows={3}
                        placeholder={
                          placeholderTemplate.detailsPlaceholder ||
                          "Catatan, rincian biaya, dll."
                        }
                        className="w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Lampiran{" "}
                        {isExpenseForm && !editingTxId && (
                          <span className="text-red-500">*</span>
                        )}
                        {isIncomeForm && (
                          <span className="font-normal normal-case text-app-body-muted/70">
                            (opsional)
                          </span>
                        )}
                      </p>
                      <div
                        className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"
                        style={{ borderColor: "var(--color-input-border)" }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files?.length) {
                              setAttachmentLabel("Belum ada file dipilih");
                              setHasAttachment(false);
                            } else if (files.length === 1) {
                              setAttachmentLabel(files[0].name);
                              setHasAttachment(true);
                            } else {
                              setAttachmentLabel(
                                `${files.length} file dipilih`,
                              );
                              setHasAttachment(true);
                            }
                          }}
                          className="absolute h-0 w-0 opacity-0"
                          id="kas-rt-attachment-input"
                        />
                        <label
                          htmlFor="kas-rt-attachment-input"
                          className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold text-white transition active:scale-90"
                          style={{ background: "var(--color-primary)" }}
                        >
                          Pilih File
                        </label>
                        <span className="flex-1 truncate text-xs text-app-body-muted">
                          {attachmentLabel}
                        </span>
                      </div>
                      {isExpenseForm && !editingTxId && !hasAttachment && (
                        <p className="mt-1.5 text-[11px] text-amber-600">
                          Wajib lampirkan bukti transaksi pengeluaran.
                        </p>
                      )}
                      {editingTxId && editingTxAttachments && editingTxAttachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-app-body-muted">
                            Lampiran Existing ({editingTxAttachments.length})
                          </p>
                          {editingTxAttachments.map((att) => {
                            const isImage = att.mime_type?.startsWith("image/");
                            return (
                              <div
                                key={att.id || att.url}
                                className="flex items-center gap-2 rounded-xl bg-app-surface-alt p-2"
                              >
                                {isImage && att.url ? (
                                  <img
                                    src={att.url}
                                    alt={att.file_name}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-primary-muted">
                                    <span className="text-lg">📄</span>
                                  </div>
                                )}
                                <span className="flex-1 truncate text-xs text-app-body">
                                  {att.file_name}
                                </span>
                                {onRemoveAttachment && att.id && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveAttachment(att.id!)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 active:scale-90"
                                    aria-label={`Hapus ${att.file_name}`}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="h-4 w-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {formError && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-[13px] text-red-600">{formError}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      formStep > 1
                        ? setFormStep((s) => (s - 1) as 1 | 2 | 3)
                        : onClose()
                    }
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
                    style={{ background: "var(--color-surface-alt)" }}
                  >
                    {formStep > 1 ? "Kembali" : "Batal"}
                  </button>
                  {formStep < 3 ? (
                    <button
                      type="button"
                      disabled={nextButtonDisabled}
                      onClick={handleNextStep}
                      className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(nextButtonDisabled)}
                    >
                      Lanjut
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isFormValid || isSubmitting}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(!isFormValid || isSubmitting)}
                    >
                      {isSubmitting ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
