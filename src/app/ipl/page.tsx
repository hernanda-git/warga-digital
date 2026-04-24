/**
 * IPL Page (Server Component)
 *
 * Fetches the logged-in user's primary house block, queries real
 * Supabase transactions for that block in the current year, computes
 * monthly payment status, and renders the client component.
 */

import { requireAuth, getUserBlokRumah, fetchIplTransactions } from "./data";
import IplPageClient from "./IplPageClient";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default async function IplPage() {
  const session = await requireAuth();
  const blokRumah = await getUserBlokRumah(session.userId);

  // Fallback for users without a registered house
  const effectiveBlok = blokRumah ?? "—";

  // Fetch real transactions from Supabase when a house exists
  const transactions = blokRumah ? await fetchIplTransactions(blokRumah) : [];

  // Compute month payment status using step-by-step filling logic
  // (same convention as kas-rt/house-status page)
  const totalPaid = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyAmount = 120000;
  const completeMonths = Math.floor(totalPaid / monthlyAmount);

  const months = MONTH_NAMES.map((name, index) => ({
    name,
    paid: index < completeMonths,
  }));

  return (
    <IplPageClient
      blokRumah={effectiveBlok}
      months={months}
      transactions={transactions}
    />
  );
}
