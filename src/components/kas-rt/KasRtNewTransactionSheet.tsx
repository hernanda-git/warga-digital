"use client";

import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  formatAmountDisplay,
  parseAmountInput,
  formatRupiah,
  applyFocusRing,
  clearFocusRing,
} from "@/lib/kas-rt-utils";
import { TRANSACTION_TYPE_OPTIONS, NO_FILE_SELECTED_LABEL } from "@/lib/kas-rt-constants";
import type { UseKasRtNewTransactionReturn } from "@/lib/hooks/use-kas-rt-new-transaction";
import type { TransactionAttachment } from "@/types/kas-rt";

interface KasRtNewTransactionSheetProps extends UseKasRtNewTransactionReturn {
  editingTxAttachments?: TransactionAttachment[] | null;
  onRemoveAttachment?: (attachmentId: string) => void;
}

export function KasRtNewTransactionSheet({
  form,
  formError,
  isOpen,
  isEditMode,
  isSubmitting,
  isIncomeForm,
  isExpenseForm,
  visibleCategories,
  isFormValid,
  placeholderTemplate,
  categoryDetails,
  defaultJumlahWarga,
  jumlahWarga,
  setJumlahWarga,
  useAutoCalculate,
  setUseAutoCalculate,
  isLoadingCategoryDetails,
  expenseBreakdown,
  fileInputRef,
  attachmentLabel,
  setAttachmentLabel,
  hasAttachment,
  setHasAttachment,
  assetId,
  assetsList,
  isLoadingAssets,
  setAssetId,
  closeForm,
  setType,
  setCategoryId,
  setAmount,
  setDate,
  setReference,
  setTitle,
  setDetails,
  handleSubmit,
  editingTxAttachments,
  onRemoveAttachment,
}: KasRtNewTransactionSheetProps) {
  if (!isOpen) return null;

  const accentColor = isIncomeForm ? "var(--color-primary)" : "#dc2626";
  const accentBg = isIncomeForm ? "rgba(13,148,136,0.12)" : "rgba(220,38,38,0.12)";
  const accentBorder = isIncomeForm ? "rgba(13,148,136,0.3)" : "rgba(220,38,38,0.3)";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={closeForm}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[90vh] w-full -translate-x-1/2 flex-col rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-tx-title"
      >
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--color-input-border)" }} />
        </div>

        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <div>
            <h2 id="new-tx-title" className="text-lg font-extrabold text-app-title">
              {isEditMode ? "Edit Transaksi" : "Catat Transaksi"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeForm}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
            aria-label="Tutup"
          >
            <XMarkIcon className="h-5 w-5 text-app-body-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {!isEditMode && (
            <>
              <div className="mb-5">
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
                        onClick={() => setType(value as "income" | "expense")}
                        className={`rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${
                          active ? "shadow-sm" : "bg-white text-app-body-muted"
                        }`}
                        style={
                          active
                            ? {
                                background: accentBg,
                                borderColor: accentBorder,
                                color: value === "income" ? "var(--color-primary)" : "#dc2626",
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

              <div className="mb-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Kategori <span className="font-normal normal-case text-red-500">*</span>
                </p>
                {visibleCategories.length === 0 ? (
                  <div className="animate-pulse rounded-2xl bg-app-surface-alt p-8" />
                ) : (
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto">
                    {visibleCategories.map((cat) => {
                      const isSelected = form.categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97] ${
                            isSelected ? "shadow-sm" : "bg-white text-app-body"
                          }`}
                          style={
                            isSelected
                              ? {
                                  background: accentBg,
                                  borderColor: accentBorder,
                                  color: isIncomeForm ? "var(--color-primary)" : "#dc2626",
                                }
                              : { borderColor: "var(--color-input-border)" }
                          }
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {isEditMode && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Edit Transaksi
              </p>
              <p className="text-xs text-app-body-muted">
                Ubah detail transaksi di bawah ini.
              </p>
            </div>
          )}

          {isExpenseForm && categoryDetails.length > 0 && (
            <div
              className="mb-5 rounded-2xl border p-4"
              style={{ borderColor: accentBorder, background: accentBg }}
            >
              {isLoadingCategoryDetails ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-24 rounded bg-red-200/50" />
                  <div className="h-10 w-full rounded bg-red-200/50" />
                  <div className="h-20 w-full rounded bg-red-200/50" />
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      Hitung Otomatis
                    </p>
                    <button
                      type="button"
                      onClick={() => setUseAutoCalculate(!useAutoCalculate)}
                      className={`flex h-6 w-11 items-center rounded-full transition-colors ${useAutoCalculate ? "bg-red-500" : "bg-gray-300"}`}
                    >
                      <span
                        className={`h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          useAutoCalculate ? "translate-x-5" : "translate-x-0.5"
                        }`}
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
                          onChange={(e) => setJumlahWarga(e.target.value)}
                          min={0}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-app-title focus:outline-none focus:ring-2"
                          style={{ borderColor: accentBorder }}
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
                          <div key={item.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-app-body">{item.name}</p>
                              <p className="text-[10px] text-app-body-muted">
                                {formatRupiah(item.rate)} × {expenseBreakdown.jumlahWarga} warga
                              </p>
                            </div>
                            <p className="ml-2 shrink-0 text-xs font-bold" style={{ color: accentColor }}>
                              {formatRupiah(item.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: accentBorder }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                          Total
                        </p>
                        <p className="text-sm font-extrabold" style={{ color: accentColor }}>
                          {formatRupiah(expenseBreakdown.total)}
                        </p>
                      </div>
                    </>
                  )}
                  {!useAutoCalculate && (
                    <p className="text-xs text-app-body-muted">
                      Mode manual aktif. Isi jumlah secara manual di bawah.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mb-5">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
              Jumlah <span className="font-normal normal-case text-red-500">*</span>
            </label>
            <div
              className={`flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all ${
                isExpenseForm && useAutoCalculate && categoryDetails.length > 0 ? "opacity-60" : ""
              }`}
              style={{ borderColor: "var(--color-input-border)" }}
            >
              <span className="text-sm font-bold text-app-body-muted">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountDisplay(form.amount)}
                onChange={(e) => setAmount(parseAmountInput(e.target.value))}
                className="flex-1 bg-transparent text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none"
                placeholder="0"
                disabled={isExpenseForm && useAutoCalculate && categoryDetails.length > 0}
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
            {isExpenseForm && useAutoCalculate && categoryDetails.length > 0 && (
              <p className="mt-1 text-[10px] text-app-body-muted">
                Jumlah diisi otomatis dari perhitungan di atas
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
              Tanggal <span className="font-normal normal-case text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
              style={{ borderColor: "var(--color-input-border)" }}
              onFocus={(e) => applyFocusRing(e.currentTarget)}
              onBlur={(e) => clearFocusRing(e.currentTarget)}
            />
          </div>

          {isIncomeForm && (
            <div className="mb-5">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Blok <span className="font-normal normal-case text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Contoh: N2"
                maxLength={20}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => applyFocusRing(e.currentTarget)}
                onBlur={(e) => clearFocusRing(e.currentTarget)}
              />
            </div>
          )}

          {/* Title & Description: show for expense always; for income only when category + reference are set */}
          {(isExpenseForm || (form.categoryId && form.reference.trim())) && (
            <>
              <div className="mb-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Judul Transaksi
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={placeholderTemplate.titlePlaceholder || "Contoh: IPL Bulan Juni"}
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => applyFocusRing(e.currentTarget)}
                  onBlur={(e) => clearFocusRing(e.currentTarget)}
                />
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Deskripsi{" "}
                  <span className="font-normal normal-case text-app-body-muted/70">(opsional)</span>
                </label>
                <textarea
                  value={form.details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder={placeholderTemplate.detailsPlaceholder || "Catatan, rincian biaya, dll."}
                  className="w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => applyFocusRing(e.currentTarget)}
                  onBlur={(e) => clearFocusRing(e.currentTarget)}
                />
              </div>
            </>
          )}

          {/* ── Asset Selector (Expense only) ─────────────────────────── */}
          {isExpenseForm && (
            <div className="mb-5">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Aset Terkait{" "}
                <span className="font-normal normal-case text-app-body-muted/70">(opsional)</span>
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                style={{ borderColor: "var(--color-input-border)" }}
              >
                <option value="">Pilih aset…</option>
                {isLoadingAssets ? (
                  <option value="" disabled>Memuat aset…</option>
                ) : (
                  assetsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.category_name ? ` (${a.category_name})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="mb-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
              Lampiran{" "}
              {isExpenseForm && (
                <span className="font-normal normal-case text-red-500">*</span>
              )}
              {isIncomeForm && (
                <span className="font-normal normal-case text-app-body-muted/70">(opsional)</span>
              )}
            </p>

            {isEditMode && editingTxAttachments && editingTxAttachments.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-app-body-muted">
                  Lampiran Existing ({editingTxAttachments.length})
                </p>
                {editingTxAttachments.map((att) => {
                  const isImage = att.mime_type?.startsWith("image/");
                  return (
                    <div key={att.id || att.url} className="flex items-center gap-2 rounded-xl bg-app-surface-alt p-2">
                      {isImage && att.url ? (
                        <img src={att.url} alt={att.file_name} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: accentBg }}>
                          <span className="text-lg">📄</span>
                        </div>
                      )}
                      <span className="flex-1 truncate text-xs text-app-body">{att.file_name}</span>
                      {onRemoveAttachment && att.id && (
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(att.id!)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 active:scale-90"
                          aria-label={`Hapus ${att.file_name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
                    setAttachmentLabel(NO_FILE_SELECTED_LABEL);
                    setHasAttachment(false);
                  } else if (files.length === 1) {
                    setAttachmentLabel(files[0].name);
                    setHasAttachment(true);
                  } else {
                    setAttachmentLabel(`${files.length} file dipilih`);
                    setHasAttachment(true);
                  }
                }}
                className="absolute h-0 w-0 opacity-0"
                id="new-tx-attachment-input"
              />
              <label
                htmlFor="new-tx-attachment-input"
                className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold text-white transition active:scale-90"
                style={{ background: "var(--color-primary)" }}
              >
                {isEditMode ? "Tambah File" : "Pilih File"}
              </label>
              <span className="flex-1 truncate text-xs text-app-body-muted">
                {attachmentLabel}
              </span>
            </div>
            {isExpenseForm && !hasAttachment && !isEditMode && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                Wajib lampirkan bukti transaksi pengeluaran.
              </p>
            )}
          </div>

          {formError && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{formError}</p>
            </div>
          )}
        </div>

        <div className="border-t border-app-border bg-app-surface px-5 pb-8 pt-4">
          <button
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={() => void handleSubmit()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={
              !isFormValid || isSubmitting
                ? { background: "var(--color-body-muted)" }
                : {
                    background: isIncomeForm ? "var(--color-primary)" : "#dc2626",
                    boxShadow: isIncomeForm
                      ? "0 8px 22px -12px var(--color-primary-shadow)"
                      : "0 8px 22px -12px rgba(220,38,38,0.35)",
                  }
            }
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              isEditMode ? "Simpan Perubahan" : "Simpan Transaksi"
            )}
          </button>
        </div>
      </div>
    </>
  );
}