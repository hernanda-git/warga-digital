/**
 * Type definitions for Kas RT (Neighborhood Finance) module
 */

export type TransactionType = "income" | "expense";

export interface TransactionAttachment {
  file_name: string;
  url: string;
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

// ==================== House Transaction Status Types ====================

export interface HouseTransactionStatus {
  blokRumah: string;
  name: string;
  status: "PRIBADI" | "KONTRAKAN";
  total2026: number;
  monthlyStatuses: number[]; // 12 numbers, sums for Jan-Dec 2026
}
