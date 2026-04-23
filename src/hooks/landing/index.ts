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
export { useJasaServicesData } from "./useJasaServicesData";
export { useJualanGoodsData } from "./useJualanGoodsData";
export { useArticlesData } from "./useArticlesData";
export { useLandingSections } from "./useLandingSections";

// Re-export types for convenience
export type { UseProfileDataReturn } from "./useProfileData";
export type { UseMarketplaceDataReturn } from "./useMarketplaceData";
export type { UseJasaServicesDataReturn } from "./useJasaServicesData";
export type { UseJualanGoodsDataReturn } from "./useJualanGoodsData";
export type { UseArticlesDataReturn } from "./useArticlesData";
export type { UseLandingSectionsReturn } from "./useLandingSections";
