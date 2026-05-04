/**
 * Landing Page (Server Component)
 *
 * Fetches all landing page data server-side and delegates
 * interactivity to the client component.
 */

import type { Metadata } from "next";
import {
  requireAuth,
  fetchLandingProfile,
  fetchLandingArticles,
  fetchLandingJualan,
  fetchLandingJasa,
} from "./data";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Warga Digital",
  description: "Ekosistem digital Sawangan Regensi RT 03",
  openGraph: {
    title: "Warga Digital",
    description: "Ekosistem digital Sawangan Regensi RT 03",
    url: "https://warga-digital.com",
    siteName: "Warga Digital",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Warga Digital",
    description: "Ekosistem digital Sawangan Regensi RT 03",
    images: ["/og-image.png"],
  },
};

export default async function LandingPage() {
  const session = await requireAuth();

  const [{ headerProfile }, { articles, error: articlesError }, jualanGoods, jasaServices] =
    await Promise.all([
      fetchLandingProfile(session.userId),
      fetchLandingArticles(),
      fetchLandingJualan(session.userId),
      fetchLandingJasa(session.userId),
    ]);

  return (
    <LandingPageClient
      headerProfile={headerProfile}
      articles={articles}
      articlesError={articlesError}
      jualanGoods={jualanGoods}
      jasaServices={jasaServices}
    />
  );
}
