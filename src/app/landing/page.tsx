"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { PageLoader } from "@/components/ui";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HorizontalCardStrip } from "@/components/landing/HorizontalCardStrip";
import { ResidentPostsSection } from "@/components/landing/ResidentPostsSection";
import { LandingSection } from "@/components/landing/LandingSection";
import { EmptyState } from "@/components/landing/empty-states/EmptyState";
import { JasaCard } from "@/components/jasa/JasaCard";
import {
  useProfileData,
  useMarketplaceData,
  useArticlesData,
  useJasaServicesData,
} from "@/hooks/landing";
import {
  ROUTES,
  MARKETPLACE_SECTIONS,
  EMPTY_STATE_CONFIGS,
} from "@/config/landing";

/**
 * Landing Page
 *
 * Main landing page for authenticated users showing:
 * - User profile header with wallet balance
 * - Feature grid for quick access to app features
 * - Community announcements (Info Warga)
 * - Marketplace sections (UMKM and JASA)
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles page composition and routing
 * - Open-Closed: New sections can be added without modifying existing code
 * - Dependency Inversion: Depends on custom hooks, not direct API calls
 *
 * Architecture:
 * - Custom hooks handle all data fetching and state management
 * - Presentational components handle rendering
 * - Services layer handles API calls
 * - Transformers handle data transformation
 */
export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── Data Hooks ─────────────────────────────────────────────────────────────
  const {
    headerProfile,
    walletBalance,
    isReady: isProfileReady,
  } = useProfileData();

  const {
    umkmItems,
    jasaItems,
    isLoaded: isMarketplaceLoaded,
    hasUmkmContent,
    hasJasaContent,
  } = useMarketplaceData();

  const {
    jasaServices,
    isLoaded: isJasaServicesLoaded,
    hasJasaContent: hasDirectJasaContent,
  } = useJasaServicesData();

  const {
    items: articles,
    isLoaded: isArticlesLoaded,
    hasContent: hasArticlesContent,
    error: articlesError,
  } = useArticlesData();

  // ── Notification Count ─────────────────────────────────────────────────────
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const res = await apiFetch("/api/notifications?count=true");
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.unreadCount ?? 0);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchNotificationCount();
  }, []);

  // ── Client-side Hydration Guard ───────────────────────────────────────────
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Authentication Guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;

    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [hasMounted, isAuthenticated, router]);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || !isProfileReady || !headerProfile) {
    return <PageLoader message="Memuat..." />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-100 min-h-0 flex-col bg-app-surface-alt">
      {/* Header */}
      <LandingHeader
        name={headerProfile.name}
        profilePictureUrl={headerProfile.profilePictureUrl}
        blokRumah={headerProfile.blokRumah}
        saldo={walletBalance}
        notificationCount={notificationCount}
        onNotificationPress={() => router.push(ROUTES.NOTIFICATIONS)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Feature Grid */}
        <FeatureGrid />

        {/* Articles Section */}
        {isArticlesLoaded && (
          <LandingSection
            title="Info Warga"
            viewAllText="Lihat semua"
            viewAllHref="/artikel"
          >
            {hasArticlesContent ? (
              <ResidentPostsSection
                title=""
                items={articles}
                detailHref={(slug) => `/artikel/${slug}`}
              />
            ) : (
              <EmptyState
                title={articlesError ? "Gagal memuat artikel" : "Belum ada artikel"}
                description={
                  articlesError
                    ? "Periksa koneksi internet Anda dan coba lagi"
                    : "Artikel akan muncul setelah admin memposting konten baru"
                }
                variant="info"
              />
            )}
          </LandingSection>
        )}

        {/* UMKM Section */}
        {isMarketplaceLoaded && (
          <LandingSection title="Umkm RT 03">
            {hasUmkmContent ? (
              <HorizontalCardStrip
                title=""
                items={umkmItems}
                viewAllHref={ROUTES.JASA}
              />
            ) : (
              <EmptyState
                title={EMPTY_STATE_CONFIGS.UMKM.title}
                description={EMPTY_STATE_CONFIGS.UMKM.description}
                variant={EMPTY_STATE_CONFIGS.UMKM.variant}
              />
            )}
          </LandingSection>
        )}

        {/* JASA Section */}
        {isJasaServicesLoaded ? (
          <LandingSection title="Jasa RT 03">
            {hasDirectJasaContent ? (
              <div className="grid grid-cols-1 gap-3 px-4">
                {jasaServices.map((service) => (
                  <JasaCard
                    key={service.id}
                    service={service}
                    onClick={() => router.push(`/jasa#${service.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={EMPTY_STATE_CONFIGS.JASA.title}
                description={EMPTY_STATE_CONFIGS.JASA.description}
                variant={EMPTY_STATE_CONFIGS.JASA.variant}
              />
            )}
          </LandingSection>
        ) : (
          <LandingSection>
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-app-body-muted animate-pulse">
                Memuat layanan jasa...
              </p>
            </div>
          </LandingSection>
        )}

        {/* Bottom Safe Area */}
        <div className="h-6" />
      </main>
    </div>
  );
}
