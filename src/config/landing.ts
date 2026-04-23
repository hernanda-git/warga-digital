/**
 * Landing Page Configuration
 *
 * Centralizes all configuration constants for the landing page.
 * Following the Open-Closed Principle: open for extension, closed for modification.
 */

import type { MarketplaceSection, EmptyStateConfig } from '@/types/landing';

// ─── API Endpoints ────────────────────────────────────────────────────────────

export const LANDING_API_ENDPOINTS = {
  PROFILE: '/api/profile',
  MARKETPLACE_SUMMARY: '/api/marketplace/summary',
  ANNOUNCEMENTS: '/api/announcements',
  ARTICLES: '/api/artikel?page=1&limit=5',
  JASA_SERVICES: '/api/jasa?limit=10&is_available=true',
  JUALAN_GOODS: '/api/jualan?limit=6&is_active=true',
} as const;

// ─── Cookie Configuration ─────────────────────────────────────────────────────

export const COOKIE_CONFIG = {
  COMMUNITY_NAME: {
    key: 'community_name',
    maxAge: 31536000, // 1 year in seconds
    path: '/',
  },
  COMMUNITY_ID: {
    key: 'community_id',
    maxAge: 31536000, // 1 year in seconds
    path: '/',
  },
} as const;

// ─── UI Configuration ─────────────────────────────────────────────────────────

export const UI_CONFIG = {
  DEFAULT_WALLET_BALANCE: 'Rp 0',
  DEFAULT_USER_NAME: 'Warga',
  DEFAULT_BLOK_LABEL: 'Blok —',
  LOADING_MESSAGE: 'Memuat...',
  MARKETPLACE_LOADING_MESSAGE: 'Memuat layanan warga...',
} as const;

// ─── Empty State Configurations ──────────────────────────────────────────────

export const EMPTY_STATE_CONFIGS: Record<string, EmptyStateConfig> = {
  ANNOUNCEMENTS: {
    title: 'Belum ada pengumuman',
    description: 'Info dan pengumuman dari pengurus RT akan muncul di sini.',
    variant: 'info',
  },
  UMKM: {
    title: 'Dukung Ekonomi Tetangga!',
    description: 'Belum ada listing UMKM terdaftar di lingkungan ini.',
    variant: 'success',
  },
  JASA: {
    title: 'Berdayakan Keahlian Warga!',
    description: 'Belum ada listing Jasa terdaftar di lingkungan ini.',
    variant: 'success',
  },
} as const;

// ─── Marketplace Sections ─────────────────────────────────────────────────────

export const MARKETPLACE_SECTIONS: readonly MarketplaceSection[] = [
  {
    type: 'UMKM',
    title: 'Umkm RT 03',
    emptyStateConfig: EMPTY_STATE_CONFIGS.UMKM,
  },
  {
    type: 'JASA',
    title: 'Jasa RT 03',
    emptyStateConfig: EMPTY_STATE_CONFIGS.JASA,
  },
] as const;

// ─── Route Configuration ──────────────────────────────────────────────────────

export const ROUTES = {
  LOGIN: '/auth/login',
  NOTIFICATIONS: '/notifikasi',
  JASA: '/jasa',
  JUALAN: '/jualan',
} as const;

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  ENABLE_PROFILE_CACHE: true,
  ENABLE_COMMUNITY_COOKIES: true,
  SHOW_EMPTY_STATES: true,
} as const;
