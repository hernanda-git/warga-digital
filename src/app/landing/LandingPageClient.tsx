"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { ResidentPostsSection } from "@/components/landing/ResidentPostsSection";
import { LandingSection } from "@/components/landing/LandingSection";
import { EmptyState } from "@/components/landing/empty-states/EmptyState";
import {
  LandingArticleSkeleton,
  LandingProductCardSkeleton,
  LandingServiceCardSkeleton,
} from "@/components/landing/skeletons";
import { JasaCard } from "@/components/jasa/JasaCard";
import { JualanCard } from "@/components/jualan/JualanCard";
import { LandingDataProvider, useLandingData } from "./landing-data-context";

// Detail modals are only useful after a card is tapped.
const JasaDetailModal = dynamic(
  () =>
    import("@/components/jasa/JasaDetailModal").then(
      (mod) => mod.JasaDetailModal,
    ),
  { ssr: false },
);

const JualanDetailModal = dynamic(
  () =>
    import("@/components/jualan/JualanDetailModal").then(
      (mod) => mod.JualanDetailModal,
    ),
  { ssr: false },
);
import { ROUTES, EMPTY_STATE_CONFIGS } from "@/config/landing";
import type { HeaderProfile } from "@/types/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type {
  JasaServiceWithMedia,
  JasaServiceDetailWithMedia,
} from "@/types/database";
import type { JualanGoodsDetail } from "@/types/jualan";

interface LandingPageClientProps {
  /**
   * Streamed server content. The shell is rendered immediately; the data
   * slot inside this slot arrives as soon as the server has it.
   */
  children?: ReactNode;
}

export default function LandingPageClient({ children }: LandingPageClientProps) {
  return (
    <LandingDataProvider>
      <LandingPageClientInner>{children}</LandingPageClientInner>
    </LandingDataProvider>
  );
}

function LandingPageClientInner({ children }: LandingPageClientProps) {
  const router = useRouter();
  const { data } = useLandingData();
  const isDataReady = !!data;

  const headerProfile = data?.headerProfile;
  const articles = data?.articles ?? [];
  const articlesError = data?.articlesError ?? null;
  const jualanGoods = data?.jualanGoods ?? [];
  const jasaServices = data?.jasaServices ?? [];

  // ── Modals ────────────────────────────────────────────────────────────────
  const [viewingService, setViewingService] =
    useState<JasaServiceDetailWithMedia | null>(null);
  const [viewingGoods, setViewingGoods] = useState<JualanGoodsDetail | null>(
    null,
  );

  // ── Notification Count ─────────────────────────────────────────────────────
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchNotificationCount = async () => {
      try {
        const res = await apiFetch("/api/notifications?count=true");
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { unreadCount: number };
          setNotificationCount(data.unreadCount ?? 0);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
        }
      }
    };
    fetchNotificationCount();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Jasa Detail Handlers ──────────────────────────────────────────────────
  const handleViewService = async (serviceId: string) => {
    try {
      const response = await apiFetch(`/api/jasa/${serviceId}`);
      const data = await response.json();
      if (data.success) {
        setViewingService(data.data);
      }
    } catch (error) {}
  };

  const handleCloseDetail = () => {
    setViewingService(null);
  };

  // ── Jualan Detail Handlers ────────────────────────────────────────────────
  const handleViewGoods = async (goodsId: string) => {
    try {
      const response = await apiFetch(`/api/jualan/${goodsId}`);
      const data = await response.json();
      if (data.success) {
        setViewingGoods(data.data);
      }
    } catch (error) {}
  };

  const handleCloseGoodsDetail = () => {
    setViewingGoods(null);
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const hasArticlesContent = articles.length > 0;
  const hasJualanContent = jualanGoods.length > 0;
  const hasDirectJasaContent = jasaServices.length > 0;

  return (
    <div className="flex h-100 min-h-0 flex-col bg-app-surface-alt">
      {/* Header */}
      <LandingHeader
        name={headerProfile?.name}
        profilePictureUrl={headerProfile?.profilePictureUrl}
        blokRumah={headerProfile?.blokRumah}
        isLoading={!isDataReady}
        notificationCount={notificationCount}
        onNotificationPress={() => router.push(ROUTES.NOTIFICATIONS)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Feature Grid */}
        <FeatureGrid />

        {/* Articles Section */}
        <LandingSection
          title="Info Warga"
          viewAllText="Lihat semua"
          viewAllHref="/artikel"
          className="lg:border-t lg:border-[var(--color-input-border)]"
        >
          {!isDataReady ? (
            <LandingArticleSkeleton count={3} />
          ) : hasArticlesContent ? (
            <ResidentPostsSection
              title=""
              items={articles}
              detailHref={(slug) => `/artikel/${slug}`}
            />
          ) : (
            <EmptyState
              title={
                articlesError ? "Gagal memuat artikel" : "Belum ada artikel"
              }
              description={
                articlesError
                  ? "Periksa koneksi internet Anda dan coba lagi"
                  : "Artikel akan muncul setelah admin memposting konten baru"
              }
              variant="info"
            />
          )}
        </LandingSection>

        {/* UMKM / Jualan Section */}
        {/* JUALAN Section */}
        <LandingSection
          title="Jual Beli RT 03"
          viewAllText="Lihat semua"
          viewAllHref={ROUTES.JUALAN}
          className="lg:border-t lg:border-[var(--color-input-border)]"
        >
          {!isDataReady ? (
            <LandingProductCardSkeleton count={5} />
          ) : hasJualanContent ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {jualanGoods.map((goods) => (
                <JualanCard
                  key={goods.id}
                  goods={goods}
                  onClick={() => handleViewGoods(goods.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={EMPTY_STATE_CONFIGS.UMKM.title}
              description={EMPTY_STATE_CONFIGS.UMKM.description}
              variant={EMPTY_STATE_CONFIGS.UMKM.variant}
            />
          )}
        </LandingSection>

        {/* JASA Section */}
        <LandingSection
          title="Jasa RT 03"
          viewAllText="Lihat semua"
          viewAllHref="/jasa"
          className="lg:border-t lg:border-[var(--color-input-border)]"
        >
          {!isDataReady ? (
            <LandingServiceCardSkeleton count={4} />
          ) : hasDirectJasaContent ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {jasaServices.map((service) => (
                <JasaCard
                  key={service.id}
                  service={service}
                  onClick={() => handleViewService(service.id)}
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

        {/* Bottom Safe Area */}
        <div className="h-6" />
      </main>

      {/* Jasa Detail Modal */}
      <JasaDetailModal
        isOpen={!!viewingService}
        onClose={handleCloseDetail}
        onEdit={() => {
          if (viewingService) {
            router.push(`/jasa#${viewingService.id}`);
          }
        }}
        service={viewingService}
      />

      {/* Jualan Detail Modal */}
      <JualanDetailModal
        isOpen={!!viewingGoods}
        onClose={handleCloseGoodsDetail}
        onEdit={() => {
          if (viewingGoods) {
            router.push(`/jualan#${viewingGoods.id}`);
          }
        }}
        onDelete={async () => {
          setViewingGoods(null);
        }}
        goods={viewingGoods}
      />

      {/* Streamed server data. Renders nothing; it only publishes the
          payload into the page once the server has it. */}
      {children}
    </div>
  );
}
