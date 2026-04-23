"use client";

import { useState } from "react";
import { Modal, ModalContent } from "@nextui-org/react";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";

interface MediaItem {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface JualanGoodsDetail {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  wa_number: string | null;
  owner_display_name: string;
  owner_user_id: string;
  owner_blok_rumah: string | null;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  media: MediaItem[];
  created_at: string;
  updated_at: string | null;
}

interface JualanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => Promise<void>;
  goods: JualanGoodsDetail | null;
}

export function JualanDetailModal({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  goods,
}: JualanDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedMedia = goods?.media
    ? [...goods.media].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const hasDiscount = !!goods && goods.discount_percent > 0;
  const isSoldOut = !!goods && goods.stock_qty <= 0;

  const handlePreviousImage = () => {
    if (sortedMedia.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? sortedMedia.length - 1 : prev - 1,
      );
    }
  };

  const handleNextImage = () => {
    if (sortedMedia.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === sortedMedia.length - 1 ? 0 : prev + 1,
      );
    }
  };

  const handleContact = () => {
    if (goods?.wa_number) {
      const message = encodeURIComponent(
        `Halo, saya tertarik dengan "${goods.name}". Apakah masih tersedia?`,
      );
      window.open(
        `https://wa.me/${goods.wa_number.replace(/[^0-9]/g, "")}?text=${message}`,
        "_blank",
      );
    }
  };

  const handleDelete = async () => {
    if (!goods) return;

    if (!confirm("Yakin ingin menghapus barang ini?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(goods.id);
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Gagal menghapus barang");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = goods?.owner_user_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdrop="blur"
      hideCloseButton
      classNames={{
        base: "max-w-lg h-[90vh] max-h-[90vh] overflow-hidden flex flex-col bg-app-surface",
        body: "p-0",
      }}
    >
      <ModalContent>
        {(modalOnClose) => (
          <div className="flex flex-col flex-1 min-h-0">
            {goods && (
              <>
                <div className="relative shrink-0">
                  <div className="relative h-64 w-full bg-app-surface-alt">
                    {sortedMedia.length > 0 ? (
                      <>
                        <img
                          src={sortedMedia[currentImageIndex]?.url}
                          alt={
                            sortedMedia[currentImageIndex]?.alt_text || goods.name
                          }
                          className="h-full w-full object-cover"
                        />

                        {sortedMedia.length > 1 && (
                          <>
                            <button
                              onClick={handlePreviousImage}
                              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                            >
                              <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={handleNextImage}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                            >
                              <ChevronRightIcon className="h-5 w-5" />
                            </button>

                            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                              {sortedMedia.map((_, index) => (
                                <div
                                  key={index}
                                  className={`h-1.5 w-1.5 rounded-full transition ${
                                    index === currentImageIndex
                                      ? "bg-white"
                                      : "bg-white/50"
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)))",
                        }}
                      >
                        <span className="text-6xl leading-none">
                          {goods.category_icon || "📦"}
                        </span>
                      </div>
                    )}

                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]">
                        <div className="flex h-full items-center justify-center">
                          <span className="rounded-lg bg-white/90 px-4 py-2 text-base font-bold text-red-600">
                            Stok Habis
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute left-3 top-3 flex gap-2">
                    {hasDiscount && (
                      <div
                        className="rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg"
                        style={{
                          background: "color-mix(in srgb, #ef4444 85%, transparent)",
                        }}
                      >
                        −{goods.discount_percent}%
                      </div>
                    )}
                    {goods.is_featured && (
                      <div
                        className="rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg"
                        style={{ background: "var(--color-primary)" }}
                      >
                        ⭐ Featured
                      </div>
                    )}
                  </div>

                  <div className="absolute right-3 top-3 flex gap-2">
                    {isOwner && (
                      <>
                        <button
                          onClick={onEdit}
                          className="rounded-full bg-white/90 p-2 text-app-body shadow-lg transition hover:bg-app-primary hover:text-white"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="rounded-full bg-white/90 p-2 text-red-600 shadow-lg transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={modalOnClose}
                      className="rounded-full bg-white/90 p-2 text-app-body shadow-lg transition hover:bg-app-surface-alt"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-2xl">{goods.category_icon || "📦"}</span>
                      <span className="text-sm font-semibold text-app-body-muted">
                        {goods.category_name}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-app-title">
                      {goods.name}
                    </h2>

                    {goods.summary && (
                      <p className="mt-1 text-sm text-app-body-muted">
                        {goods.summary}
                      </p>
                    )}
                  </div>

                  <div className="mb-4 rounded-2xl bg-app-surface-alt p-4">
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-2xl font-extrabold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {formatRupiah(goods.final_price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-app-body-muted line-through">
                          {formatRupiah(goods.base_price)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-app-body-muted">
                      per {goods.unit_label}
                    </p>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-app-surface-alt p-3 text-center">
                      <p className="text-xs font-medium text-app-body-muted">
                        Stok Tersedia
                      </p>
                      <p className="mt-1 text-lg font-bold text-app-title">
                        {goods.stock_qty}
                      </p>
                    </div>
                    <div className="rounded-xl bg-app-surface-alt p-3 text-center">
                      <p className="text-xs font-medium text-app-body-muted">
                        Terjual
                      </p>
                      <p className="mt-1 text-lg font-bold text-app-title">
                        {goods.sold_count}
                      </p>
                    </div>
                  </div>

                  {goods.description && (
                    <div className="mb-4">
                      <h3 className="mb-2 text-sm font-bold text-app-title">
                        Deskripsi
                      </h3>
                      <p className="text-sm leading-relaxed text-app-body">
                        {goods.description}
                      </p>
                    </div>
                  )}

                  <div className="mb-4 rounded-xl bg-app-surface-alt p-4">
                    <h3 className="mb-3 text-sm font-bold text-app-title">
                      Informasi Penjual
                    </h3>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {goods.owner_display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-app-title">
                          {goods.owner_display_name}
                        </p>
                        {goods.owner_blok_rumah && (
                          <p className="text-sm text-app-body-muted">
                            {goods.owner_blok_rumah}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleContact}
                      disabled={!goods.wa_number || isSoldOut}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-app-primary py-3.5 text-sm font-bold text-white transition hover:bg-app-primary-hover disabled:opacity-50"
                    >
                      <PhoneIcon className="h-5 w-5" />
                      Hubungi Penjual
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
