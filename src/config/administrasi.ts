import type { EmptyStateConfig } from "@/types/landing";

export const ADMINISTRASI_API_ENDPOINTS = {
  CATEGORIES: "/api/administrasi/categories",
  LETTER_TYPES: "/api/administrasi/types",
  LETTER_TYPE: (slug: string) => `/api/administrasi/types/${slug}`,
  LETTERS: "/api/administrasi/letters",
  LETTER: (id: string) => `/api/administrasi/letters/${id}`,
  PUBLISH: (id: string) => `/api/administrasi/letters/${id}/publish`,
  REJECT: (id: string) => `/api/administrasi/letters/${id}/reject`,
} as const;

export const ROUTES = {
  DASHBOARD: "/administrasi",
  BARU: (slug: string) => `/administrasi/baru/${slug}`,
  SURAT: (id: string) => `/administrasi/surat/${id}`,
  CETAK: (id: string) => `/administrasi/surat/${id}/cetak`,
} as const;

export const LETTER_STATUS_LABELS: Record<string, string> = {
  draft: "Konsep",
  published: "Terbit",
  rejected: "Ditolak",
} as const;

export const LETTER_STATUS_COLORS: Record<string, string> = {
  draft: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20",
  published: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20",
  rejected: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
} as const;

export const EMPTY_STATE_CONFIGS: Record<string, EmptyStateConfig> = {
  ADMINISTRASI: {
    title: "Belum ada surat",
    description: "Ajukan surat keterangan atau pengantar RT di sini.",
    variant: "info",
  },
  CATEGORY_EMPTY: {
    title: "Belum ada jenis surat",
    description: "Jenis surat akan ditambahkan oleh pengurus RT.",
    variant: "info",
  },
} as const;

export const MONTH_ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
} as const;
