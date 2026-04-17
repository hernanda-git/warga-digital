/**
 * Utility functions for Kas RT (Neighborhood Finance) module
 * All functions are pure and have no side effects
 */

import type { KasRtFormState } from "@/types/kas-rt";

/**
 * Format a number as Indonesian Rupiah currency
 */
export function formatRupiah(value: number): string {
  // Guard against NaN and invalid numbers
  if (isNaN(value) || !isFinite(value)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRupiahCompact(value: number): string {
  // Guard against NaN and invalid numbers
  if (isNaN(value) || !isFinite(value)) {
    return "Rp 0";
  }
  const abs = Math.abs(value);

  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;

    return `${sign}${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}jt`;
  }

  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}rb`;
  }

  return `${sign}${abs.toLocaleString("id-ID")}`;
}

/**
 * Convert a Date to an HTML date input value (YYYY-MM-DD)
 */
export function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

/**

 * Format amount display with thousand separators

 */

export function formatAmountDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits === "") return "";

  return Number(digits).toLocaleString("en-US");
}

/**
 * Format a date string (YYYY-MM-DD) to Indonesian format (e.g., "15 Apr 2026")
 */
export function formatDateIndonesian(dateString: string): string {
  const date = new Date(dateString + "T00:00:00"); // Ensure proper parsing
  return date.toLocaleDateString("id-ID", {
    day: "numeric",

    month: "short",
    year: "numeric",
  });
}

/**
 * Parse amount input to extract only digits
 */
export function parseAmountInput(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Get month name in Indonesian
 */
export function getMonthNameIndonesian(date: Date): string {
  return date.toLocaleString("id-ID", { month: "long" });
}

/**
 * Returns a month/year separator string in Indonesian format.
 * Example: "Maret 2026"
 */
export function getMonthYearSeparator(date: Date): string {
  const month = date.toLocaleString("id-ID", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

/**
 * Returns a month/year key for grouping transactions.
 * Format: "YYYY-MM" for consistent grouping
 */
export function getMonthYearKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Apply template variables to a template string
 */
export function applyTemplate(
  template: string,
  vars: { bulan: string; blok: string },
): string {
  return template
    .replace(/\{bulan\}/g, vars.bulan)
    .replace(/\{blok\}/g, vars.blok);
}

/**
 * Get default form state for a new transaction
 */
export function getDefaultKasRtForm(now: Date): KasRtFormState {
  return {
    type: "income",
    categoryId: "",
    amount: "120000",
    date: toDateInputValue(now),
    reference: "",
    title: "",
    details: "",
  };
}

/**
 * Apply focus ring styling to an element
 */
export function applyFocusRing(el: HTMLElement): void {
  el.style.borderColor = "var(--color-primary)";
  el.style.boxShadow =
    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
}

/**
 * Clear focus ring styling from an element
 */
export function clearFocusRing(el: HTMLElement): void {
  el.style.borderColor = "var(--color-input-border)";
  el.style.boxShadow = "none";
}

/**
 * Calculate expense breakdown from category details
 */
export function calculateExpenseBreakdown(
  categoryDetails: { id: string; name: string; rate_per_warga: number }[],
  jumlahWarga: number,
): {
  items: { id: string; name: string; rate: number; amount: number }[];
  total: number;
} {
  const items = categoryDetails.map((detail) => ({
    id: detail.id,
    name: detail.name,
    rate: detail.rate_per_warga,
    amount: detail.rate_per_warga * jumlahWarga,
  }));

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return { items, total };
}

/**
 * Check if a transaction might be a duplicate
 * For expense transactions (no reference required), skip reference matching
 */
export function findDuplicateTransactions(
  transactions: {
    id: string;
    date: string;
    reference: string;
    type?: "income" | "expense";
  }[],
  formDate: string,
  formReference: string,
  excludeId?: string,
  formType?: "income" | "expense",
): { id: string; date: string; reference: string }[] {
  const formMonth = new Date(formDate).getMonth();
  const formYear = new Date(formDate).getFullYear();
  const formBlock = formReference.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (excludeId && tx.id === excludeId) return false;
    const d = new Date(tx.date);

    // For expense transactions, skip reference matching (only check date)
    if (formType === "expense") {
      return d.getMonth() === formMonth && d.getFullYear() === formYear;
    }

    // For income transactions, check both reference and date
    return (
      (tx.reference ?? "").trim().toLowerCase() === formBlock &&
      d.getMonth() === formMonth &&
      d.getFullYear() === formYear
    );
  });
}
