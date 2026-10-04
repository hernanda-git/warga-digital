/**
 * Type definitions for Kas RT (Neighborhood Finance) module
 */

export type TransactionType = "income" | "expense";

export interface TransactionAttachment {
  id?: string;
  file_name: string;
  url: string | null;
  mime_type: string | null;
}

export interface KasRtCategory {
  id: string;
  name: string;
  applies_to: "income" | "expense" | "both";
  title_template: string;
  desc_template: string;
  sort_order: number;
}

export interface CategoryDetail {
  id: string;
  category_id: string;
  name: string;
  rate_per_warga: number;
  sort_order: number;
  is_active: boolean;
}

export interface TransactionDetail {
  id: string;
  name: string;
  rate_per_warga: number;
  jumlah_warga: number;
  subtotal: number;
  sort_order: number;
}

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  created_at?: string;
  created_by?: string | null;
  created_by_full_name?: string | null;
  reference: string;
  details: string | null;
  category: string | null;
  attachments: TransactionAttachment[];
  transaction_details?: TransactionDetail[];
  is_shadow?: boolean;
  asset_id?: string | null;
  asset_name?: string | null;
}

export interface KasRtFormState {
  type: TransactionType;
  categoryId: string;
  amount: string;
  date: string;
  reference: string;
  title: string;
  details: string;
}

export interface ExpenseBreakdownItem {
  id: string;
  name: string;
  rate: number;
  amount: number;
}

export interface ExpenseBreakdown {
  items: ExpenseBreakdownItem[];
  total: number;
  jumlahWarga: number;
}

export interface KasRtTotals {
  balance: number;
  balanceEndOfPrevMonth: number;
  prevMonthEndLabel: string;
  thisMonthIncome: number;
  thisMonthExpense: number;
  thisMonthNet: number;
  deltaFromPrevious: number;
}

export interface KasRtFilterState {
  typeFilter: "all" | TransactionType;
  categoryFilter: string;
  blockFilter: string;
  startDate: string;
  endDate: string;
}

export interface KasRtDownloadState {
  startDate: string;
  endDate: string;
  category: string;
  block: string;
  format: "excel" | "pdf";
}

export interface DuplicateWarningState {
  matches: TransactionItem[];

  onConfirm: () => void;
}

// ==================== Summary Page Types ====================

export interface MonthlyData {
  month: string; // "2026-01"
  label: string; // "Jan"
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;

  count: number;
  percentage: number;
}

export interface IplCollection {
  totalHouses: number;
  paidHouses: number;
  percentage: number;
  unpaidHouses: string[]; // Block numbers
  /**
   * How many of `paidHouses` are settled purely by an active payment override
   * (no money received). These contribute to the paid count but to no total.
   */
  overridePaidHouses?: number;
}

export interface QuickStats {
  avgPerDay: number;
  bestDay: { date: string; amount: number };
  worstDay: { date: string; amount: number };
  highestCategory: { name: string; amount: number };
}

export interface SelectedMonthData {
  year: number;
  month: number;
  label: string; // "April 2026"
  income: number;

  expense: number;
  net: number;
  transactionCount: number;
  byCategory: CategoryBreakdown[];
  dailyBreakdown: {
    date: string;
    income: number;
    expense: number;
  }[];
}

export interface PreviousMonthData {
  income: number;
  expense: number;
  net: number;
  label: string; // "Maret 2026"
}

export interface KasRtSummaryResponse {
  selectedMonth: SelectedMonthData;
  previousMonth: PreviousMonthData;
  yearlyTrend: MonthlyData[];
  iplCollection: IplCollection;
  stats: QuickStats;
}

export interface KasRtSummaryFilter {
  year: number;
  month: number;
}

// ==================== House Types ====================

export interface KasRtHouse {
  id: string;
  name: string;
  blok_rumah: string;
  status: "PRIBADI" | "KONTRAKAN";
}

// ==================== House Transaction Status Types ====================

export interface HouseTransactionStatus {
  blokRumah: string;
  name: string;
  status: "PRIBADI" | "KONTRAKAN";
  /** Rupiah actually received in 2026 — real transactions only, never overrides. */
  total2026: number;
  monthlyStatuses: number[]; // 12 numbers, sums for Jan-Dec 2026
  /**
   * Months credited by an active house_payment_override (0..12).
   * These raise the "Lunas" count and fill months visually, but never add money.
   */
  overrideMonths: number;
  /**
   * Exact calendar months (1=Jan..12=Dec) the active override credits.
   * Supersedes the January-anchored interpretation of `overrideMonths`.
   */
  overrideMonthNumbers: number[];
  /** True when real money + override credit covers the full year. */
  isSettled: boolean;
  /** Short reason label from the active override, e.g. PEMBEBASAN. */
  overrideReason: string | null;
  /** Free-text justification from the active override. */
  overrideNotes: string | null;
  /** Id of the active override row, so revoke needs no extra lookup. */
  overrideId: string | null;
  /** House id, needed to mark/revoke an override. */
  houseId: string | null;
}

// ==================== House Payment Override Types ====================

export interface HousePaymentOverride {
  id: string;
  house_id: string;
  blokRumah: string;
  houseName: string;
  year: number;
  credited_months: number;
  /** Exact calendar months (1..12) this override credits. */
  credited_month_numbers: number[];
  reason: string | null;
  notes: string | null;
  is_active: boolean;
  marked_at: string;
  marked_by_full_name: string | null;
  revoked_at: string | null;
  revoked_by_full_name: string | null;
}
