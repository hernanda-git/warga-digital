import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warga Digital",
  description: "Ekosistem digital Sawangan Regensi RT 03",
  metadataBase: new URL("https://warga-digital.com"),
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
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
          <Analytics />
          <SpeedInsights />
          <Toaster
            position="bottom-center"
            offset={80}
            toastOptions={{
              style: {
                maxWidth: "390px",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: "500",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
