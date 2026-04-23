/**
 * Landing Page (Server Component)
 *
 * Fetches all landing page data server-side and delegates
 * interactivity to the client component.
 */

import {
  requireAuth,
  fetchLandingProfile,
  fetchLandingArticles,
  fetchLandingJualan,
  fetchLandingJasa,
} from "./data";
import LandingPageClient from "./LandingPageClient";

export default async function LandingPage() {
  const session = await requireAuth();

  const [{ headerProfile, walletBalance }, { articles, error: articlesError }, jualanGoods, jasaServices] =
    await Promise.all([
      fetchLandingProfile(session.userId),
      fetchLandingArticles(),
      fetchLandingJualan(session.userId),
      fetchLandingJasa(session.userId),
    ]);

  return (
    <LandingPageClient
      headerProfile={headerProfile}
      walletBalance={walletBalance}
      articles={articles}
      articlesError={articlesError}
      jualanGoods={jualanGoods}
      jasaServices={jasaServices}
    />
  );
}
