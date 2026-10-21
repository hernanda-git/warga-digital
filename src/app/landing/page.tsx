/**
 * Landing Page (Server Component)
 *
 * The page shell is sent to the browser as soon as the session is known.
 * The content (profile, articles, jualan, jasa) is loaded by a streamed
 * server component and fills the page in when it arrives, so the header,
 * the feature grid and the section frames are usable immediately.
 */

import { Suspense } from "react";
import type { Metadata } from "next";

import { requireAuth } from "./data";
import { LandingDataSlot } from "./LandingDataSlot";
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

  return (
    <LandingPageClient>
      <Suspense fallback={null}>
        <LandingDataSlot userId={session.userId} />
      </Suspense>
    </LandingPageClient>
  );
}
