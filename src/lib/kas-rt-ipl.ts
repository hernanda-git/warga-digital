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

// ── Explicit calendar months ────────────────────────────────────────────────
//
// A count of months is January-anchored and cannot express "NOV + DES" or
// "up to October". An override may therefore name the exact months it covers.

/** Normalise a month list to sorted, unique, valid 1..12 values. */
export function normalizeMonthNumbers(
  months: readonly number[] | null | undefined,
): number[] {
  if (!months?.length) return [];
  const clean = months
    .map((m) => Number(m))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= IPL_MONTHS_PER_YEAR);
  return Array.from(new Set(clean)).sort((a, b) => a - b);
}

/**
 * Months a house has covered, as explicit 1..12 numbers.
 *
 * Real money fills months sequentially from January (the card's existing
 * rule), then the override's named months are added on top — so a house can be
 * credited for NOV+DES while its money only covers part of the year.
 */
export function coveredMonthNumbers(
  realAmount: number,
  overrideMonthNumbers: readonly number[] | null | undefined,
): number[] {
  const fromMoney =
    completeMonthsForAmount(realAmount) +
    (remainderForAmount(realAmount) > 0 ? 1 : 0);
  const moneyMonths = Array.from(
    { length: Math.min(fromMoney, IPL_MONTHS_PER_YEAR) },
    (_, i) => i + 1,
  );
  return normalizeMonthNumbers([
    ...moneyMonths,
    ...normalizeMonthNumbers(overrideMonthNumbers),
  ]);
}

/**
 * Months covered by an override but NOT by real money — the ones the UI must
 * render as "ditanggung penyesuaian" rather than as a payment.
 */
export function overrideOnlyMonthNumbers(
  realAmount: number,
  overrideMonthNumbers: readonly number[] | null | undefined,
): number[] {
  const fromMoney =
    completeMonthsForAmount(realAmount) +
    (remainderForAmount(realAmount) > 0 ? 1 : 0);
  const moneySet = new Set(
    Array.from({ length: Math.min(fromMoney, IPL_MONTHS_PER_YEAR) }, (_, i) => i + 1),
  );
  return normalizeMonthNumbers(overrideMonthNumbers).filter(
    (m) => !moneySet.has(m),
  );
}

/** True when the override (money + named months) covers the whole year. */
export function isSettledByMonths(
  realAmount: number,
  overrideMonthNumbers: readonly number[] | null | undefined,
): boolean {
  return (
    coveredMonthNumbers(realAmount, overrideMonthNumbers).length >=
    IPL_MONTHS_PER_YEAR
  );
}

/** Indonesian short month labels, indexed 1..12 (index 0 unused). */
export const IPL_MONTH_LABELS_ID = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;
