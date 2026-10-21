import type {
  TransactionItem,
  KasRtCategory,
  KasRtTotals,
} from "@/types/kas-rt";

/**
 * The data the Kas RT page needs, in one bundle.
 *
 * It is produced on the server and streamed into the page shell, so the
 * shell (header, filter bar, action buttons) can be painted and used while
 * the numbers are still on their way.
 */
export interface KasRtPageData {
  transactions: TransactionItem[];
  total: number;
  categories: KasRtCategory[];
  canSubmitTransaction: boolean;
  summary: KasRtTotals | null;
  blockNames: string[];
}
