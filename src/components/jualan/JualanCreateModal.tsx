"use client";

import { useState, useRef } from "react";
import { Modal, ModalContent } from "@nextui-org/react";
import { XMarkIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import { PrimaryButton } from "@/components/ui";

interface JualanCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  categories: Array<{ id: string; name: string; icon: string | null }>;
}

const COMMON_UOMS = [
  { value: "pcs", label: "Pcs (Pieces)" },
  { value: "kg", label: "Kg (Kilogram)" },
  { value: "pack", label: "Pack" },
  { value: "loyang", label: "Loyang" },
  { value: "botol", label: "Botol" },
  { value: "karung", label: "Karung" },
  { value: "dus", label: "Dus" },
  { value: "lainnya", label: "Lainnya" },
];

export function JualanCreateModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
}: JualanCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    summary: "",
    description: "",
    base_price: "",
    discount_percent: "0",
    unit_label: "pcs",
    custom_unit: "",
    stock_qty: "0",
    wa_number: "",
    is_featured: false,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalImages = pendingImages.length + files.length;
    if (totalImages > 5) {
      alert("Maksimal 5 gambar per barang");
      return;
    }

    setPendingImages((prev) => [...prev, ...files]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (itemId: string, files: File[]) => {
    if (files.length === 0) return [];

    setIsUploading(true);
    try {
      const uploadPayload = {
        files: files.map((file) => ({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        })),
      };

      const response = await apiFetch(`/api/jualan/${itemId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Gagal mengunggah gambar");
      }

      const uploadPromises = data.data.uploadUrls.map(
        async (upload: any, index: number) => {
          const file = files[index];
          await fetch(upload.uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          return {
            filename: upload.filename,
            publicUrl: upload.publicUrl,
            objectKey: upload.objectKey,
          };
        },
      );

      const uploaded = await Promise.all(uploadPromises);

      const mediaData = uploaded.map((img, index) => ({
        filename: img.filename,
        publicUrl: img.publicUrl,
        altText: img.filename,
        sortOrder: index,
        isPrimary: index === 0,
      }));

      await apiFetch(`/api/jualan/${itemId}/upload`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media: mediaData }),
      });

      return uploaded;
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const unitLabel =
        formData.unit_label === "lainnya"
          ? formData.custom_unit || "pcs"
          : formData.unit_label;

      const createPayload = {
        category_id: formData.category_id,
        name: formData.name,
        summary: formData.summary,
        description: formData.description,
        base_price: parseFloat(formData.base_price) || 0,
        discount_percent: parseFloat(formData.discount_percent) || 0,
        unit_label: unitLabel,
        stock_qty: parseInt(formData.stock_qty) || 0,
        wa_number: formData.wa_number || null,
        is_featured: formData.is_featured,
      };

      const response = await apiFetch("/api/jualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Gagal membuat listing");
      }

      const itemId = data.data.id;

      let uploadedImages = [];
      if (pendingImages.length > 0) {
        uploadedImages = await uploadImages(itemId, pendingImages);
      }

      await onSubmit({ itemId, images: uploadedImages });
      handleClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal membuat listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      category_id: "",
      name: "",
      summary: "",
      description: "",
      base_price: "",
      discount_percent: "0",
      unit_label: "pcs",
      custom_unit: "",
      stock_qty: "0",
      wa_number: "",
      is_featured: false,
    });
    setPendingImages([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
            <div className="flex items-center justify-between border-b border-app-input-border p-4 shrink-0">
              <h2 className="text-lg font-bold text-app-title">Jual Barang Baru</h2>
              <button
                onClick={modalOnClose}
                className="rounded-full p-2 text-app-body-muted transition hover:bg-app-surface-alt hover:text-app-body"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-app-body">
                  Foto Barang
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {pendingImages.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                      {index === 0 && (
                        <div className="absolute left-1 top-1 rounded bg-app-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Utama
                        </div>
                      )}
                      <button
                        onClick={() => handleRemovePendingImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white transition hover:bg-red-500"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {pendingImages.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-app-input-border bg-app-surface-alt transition hover:border-app-primary hover:bg-app-primary/5"
                    >
                      <PhotoIcon className="h-8 w-8 text-app-body-muted" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-app-body-muted">
                  Maksimal 5 foto (JPEG, PNG, WebP). Foto pertama adalah utama.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Kategori
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || "📦"} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Nama Barang
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Beras Premium 5kg"
                    className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Ringkasan
                  </label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) =>
                      setFormData({ ...formData, summary: e.target.value })
                    }
                    placeholder="Deskripsi singkat (max 100 karakter)"
                    maxLength={100}
                    className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Deskripsi Lengkap
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Jelaskan detail barang, kondisi, dll"
                    rows={3}
                    className="w-full rounded-xl border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-app-body">
                      Harga Dasar (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) =>
                        setFormData({ ...formData, base_price: e.target.value })
                      }
                      placeholder="0"
                      className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-app-body">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_percent: e.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-app-body">
                      Satuan
                    </label>
                    <select
                      value={formData.unit_label}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_label: e.target.value })
                      }
                      className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                    >
                      {COMMON_UOMS.map((uom) => (
                        <option key={uom.value} value={uom.value}>
                          {uom.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.unit_label === "lainnya" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-app-body">
                        Satuan Lainnya
                      </label>
                      <input
                        type="text"
                        value={formData.custom_unit}
                        onChange={(e) =>
                          setFormData({ ...formData, custom_unit: e.target.value })
                        }
                        placeholder="Contoh: liter"
                        className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    value={formData.stock_qty}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_qty: e.target.value })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-app-body">
                    Nomor WhatsApp (untuk kontak)
                  </label>
                  <input
                    type="tel"
                    value={formData.wa_number}
                    onChange={(e) =>
                      setFormData({ ...formData, wa_number: e.target.value })
                    }
                    placeholder="08123456789"
                    className="h-11 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) =>
                      setFormData({ ...formData, is_featured: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-app-input-border text-app-primary focus:ring-app-primary"
                  />
                  <label htmlFor="is_featured" className="text-sm text-app-body">
                    Tandai sebagai Featured (unggulan)
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-app-input-border p-4">
              <PrimaryButton
                onPress={handleSubmit}
                isDisabled={
                  isSubmitting ||
                  isUploading ||
                  !formData.category_id ||
                  !formData.name ||
                  !formData.base_price
                }
                className="w-full"
              >
                {isSubmitting || isUploading ? "Menyimpan..." : "Jual Barang"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
