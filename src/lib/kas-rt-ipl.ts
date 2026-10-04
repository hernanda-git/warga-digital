/**
 * Shared IPL (Iuran Pemeliharaan Lingkungan) constants for the Kas RT module.
 *
 * These amounts decide what "Lunas" means on /kas-rt/house-status and in the
 * summary. They were previously duplicated as bare literals (120000 / 1440000)
 * across the house-status page, the vertical card, and the summary library —
 * single-sourced here so the money rules cannot drift apart.
 */

/** Monthly IPL installment per house. */
export const IPL_MONTHLY_AMOUNT = 120000;

/** Months in an IPL year. */
export const IPL_MONTHS_PER_YEAR = 12;

/** A full year of IPL for one house. */
export const IPL_ANNUAL_TARGET = IPL_MONTHLY_AMOUNT * IPL_MONTHS_PER_YEAR;

/**
 * Number of fully-covered months implied by a rupiah amount.
 * Amounts below one installment count as zero complete months.
 */
export function completeMonthsForAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / IPL_MONTHLY_AMOUNT);
}

/** Remainder rupiah after the last complete month. */
export function remainderForAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount % IPL_MONTHLY_AMOUNT;
}

/**
 * Effective covered months for a house, combining real money and override credit.
 *
 * `overrideMonths` is credited *on top of* whatever the real payments already
 * cover, capped at a full year. This is what makes a house read as "Lunas"
 * without any money having moved.
 */
export function effectiveCoveredMonths(
  realAmount: number,
  overrideMonths: number,
): number {
  const fromMoney =
    completeMonthsForAmount(realAmount) +
    (remainderForAmount(realAmount) > 0 ? 1 : 0);
  const credited = Number.isFinite(overrideMonths) ? Math.max(0, overrideMonths) : 0;
  return Math.min(IPL_MONTHS_PER_YEAR, fromMoney + credited);
}

/** True when a house counts as settled for the year (money + override credit). */
export function isHouseSettled(
  realAmount: number,
  overrideMonths: number,
): boolean {
  return effectiveCoveredMonths(realAmount, overrideMonths) >= IPL_MONTHS_PER_YEAR;
}
