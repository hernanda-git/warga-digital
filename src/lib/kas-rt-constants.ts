/**
 * Constants for Kas RT (Neighborhood Finance) module
 */

import { toDateInputValue } from "./kas-rt-utils";

/**
 * Default amount for new income transactions
 */
export const DEFAULT_INCOME_AMOUNT = "120000";

/**
 * Pull-to-refresh threshold in pixels
 */
export const PULL_TO_REFRESH_THRESHOLD = 48;

/**
 * Maximum pull distance for pull-to-refresh
 */
export const MAX_PULL_DISTANCE = 80;

/**
 * Success message auto-dismiss timeout in milliseconds
 */
export const SUCCESS_MESSAGE_TIMEOUT = 3500;

/**
 * Filter type options
 */
export const FILTER_TYPE_OPTIONS = [
  { key: "all", label: "Semua" },
  { key: "income", label: "Pemasukan" },
  { key: "expense", label: "Pengeluaran" },
] as const;

/**
 * Transaction type options for form
 */
export const TRANSACTION_TYPE_OPTIONS = [
  { value: "income", label: "➕ Pemasukan" },
  { value: "expense", label: "➖ Pengeluaran" },
] as const;

/**
 * Download format options
 */
export const DOWNLOAD_FORMAT_OPTIONS = [
  { value: "excel", label: "Excel (.xlsx)", icon: "table" },
  { value: "pdf", label: "PDF (.pdf)", icon: "document" },
] as const;

/**
 * Get default filter dates for current month
 */
export function getDefaultFilterDates(now: Date) {
  return {
    startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateInputValue(now),
  };
}

/**
 * File attachment label when no files selected
 */
export const NO_FILE_SELECTED_LABEL = "Belum ada file dipilih";

/**
 * Default community name
 */
export const DEFAULT_COMMUNITY_NAME = "Warga Digital";
