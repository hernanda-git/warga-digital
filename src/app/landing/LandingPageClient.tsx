"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { ResidentPostsSection } from "@/components/landing/ResidentPostsSection";
import { LandingSection } from "@/components/landing/LandingSection";
import { EmptyState } from "@/components/landing/empty-states/EmptyState";
import { JasaCard } from "@/components/jasa/JasaCard";
import { JasaDetailModal } from "@/components/jasa/JasaDetailModal";
import { JualanCard } from "@/components/jualan/JualanCard";
import { JualanDetailModal } from "@/components/jualan/JualanDetailModal";
import { ROUTES, EMPTY_STATE_CONFIGS } from "@/config/landing";
import type { HeaderProfile } from "@/types/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type { JasaServiceWithMedia, JasaServiceDetailWithMedia } from "@/types/database";
import type { JualanGoodsDetail } from "@/types/jualan";

interface LandingPageClientProps {
  headerProfile: HeaderProfile;
  walletBalance: string;
  articles: ResidentPostItem[];
  articlesError: string | null;
  jualanGoods: JualanGoodsWithMedia[];
  jasaServices: JasaServiceWithMedia[];
}

export default function LandingPageClient({
  headerProfile,
  walletBalance,
  articles,
  articlesError,
  jualanGoods,
  jasaServices,
}: LandingPageClientProps) {
  const router = useRouter();

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
    } catch (error) {
    }
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
    } catch (error) {
    }
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

        {/* UMKM / Jualan Section */}
        <LandingSection
          title="Jual Beli RT 03"
          viewAllText="Lihat semua"
          viewAllHref={ROUTES.JUALAN}
        >
          {hasJualanContent ? (
            <div className="grid grid-cols-2 gap-3">
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
        >
          {hasDirectJasaContent ? (
            <div className="grid grid-cols-1 gap-3">
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
    </div>
  );
}
