/**
 * Landing Page Hooks Index
 *
 * Barrel export for all landing page custom hooks.
 * This provides a clean, single import point for consumers.
 *
 * @example
 * import { useProfileData, useMarketplaceData, useJasaServicesData } from '@/hooks/landing';
 */

export { useProfileData } from "./useProfileData";
export { useMarketplaceData } from "./useMarketplaceData";
export { useAnnouncementsData } from "./useAnnouncementsData";
export { useJasaServicesData } from "./useJasaServicesData";
export { useArticlesData } from "./useArticlesData";

// Re-export types for convenience
export type { UseProfileDataReturn } from "./useProfileData";
export type { UseMarketplaceDataReturn } from "./useMarketplaceData";
export type { UseAnnouncementsDataReturn } from "./useAnnouncementsData";
export type { UseJasaServicesDataReturn } from "./useJasaServicesData";
export type { UseArticlesDataReturn } from "./useArticlesData";
