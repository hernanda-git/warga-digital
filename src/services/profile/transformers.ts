/**
 * Profile Page Data Transformers
 *
 * Pure functions for transforming data between API format and UI format.
 * Following SOLID principles:
 * - Single Responsibility: Each function transforms one specific data type
 * - Pure Functions: No side effects, predictable outputs for given inputs
 * - Open-Closed: Easy to extend with new transformers without modifying existing ones
 *
 * These transformers serve as an anti-corruption layer between API contracts
 * and UI components, allowing either side to evolve independently.
 */

import { DATE_CONFIG, RELATIONSHIP_LABELS } from '@/config/profile';
import type {
  ProfileData,
  HouseInfo,
  ProfileResidence,
  FamilyMember,
  PendingJoinRequestItem,
  RelationshipType,
} from '@/types/profile';

// ─── Date Transformers ────────────────────────────────────────────────────────

/**
 * Formats an ISO date string to Indonesian locale display format
 *
 * Business Rules:
 * - If date is null/undefined/empty, return fallback placeholder
 * - Format as "DD Month YYYY" in Indonesian (e.g., "15 Januari 2024")
 * - Handle invalid dates gracefully
 *
 * @param iso - ISO 8601 date string (e.g., "2024-01-15T00:00:00Z")
 * @returns Formatted date string or placeholder
 *
 * @example
 * formatDate("2024-01-15") // => "15 Januari 2024"
 * formatDate(null)         // => "—"
 * formatDate("")           // => "—"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso || iso.trim() === '') {
    return DATE_CONFIG.FALLBACK_DISPLAY;
  }

  try {
    const date = new Date(iso);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return DATE_CONFIG.FALLBACK_DISPLAY;
    }

    return new Intl.DateTimeFormat(DATE_CONFIG.LOCALE, {
      day: DATE_CONFIG.FORMAT.DAY,
      month: DATE_CONFIG.FORMAT.MONTH,
      year: DATE_CONFIG.FORMAT.YEAR,
    } as Intl.DateTimeFormatOptions).format(date);
  } catch (error) {
    return DATE_CONFIG.FALLBACK_DISPLAY;
  }
}

/**
 * Converts an ISO date string to HTML date input value (YYYY-MM-DD)
 *
 * Business Rules:
 * - If date is null/undefined/empty, return empty string
 * - Extract and format as YYYY-MM-DD for input[type="date"]
 * - Handle invalid dates gracefully
 *
 * @param iso - ISO 8601 date string
 * @returns Date in YYYY-MM-DD format or empty string
 *
 * @example
 * toDateInputValue("2024-01-15T00:00:00Z") // => "2024-01-15"
 * toDateInputValue(null)                   // => ""
 * toDateInputValue("invalid")              // => ""
 */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso || iso.trim() === '') {
    return '';
  }

  try {
    const date = new Date(iso);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Extract YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

// ─── Profile Transformers ─────────────────────────────────────────────────────

/**
 * Transforms raw API response data into ProfileData type
 *
 * Business Rules:
 * - Provide sensible defaults for optional fields
 * - Normalize data structure for UI consumption
 * - Handle missing or malformed data gracefully
 *
 * @param apiData - Raw API response (any type for flexibility)
 * @returns Typed ProfileData object
 *
 * @example
 * const profile = transformProfileData(apiResponse);
 */
export function transformProfileData(apiData: any): ProfileData {
  return {
    id: apiData?.id ?? '',
    fullName: apiData?.fullName ?? '',
    username: apiData?.username ?? null,
    waNumber: apiData?.waNumber ?? null,
    waNumberMasked: apiData?.waNumberMasked ?? null,
    email: apiData?.email ?? null,
    dateOfBirth: apiData?.dateOfBirth ?? null,
    status: apiData?.status ?? 'ACTIVE',
    createdAt: apiData?.createdAt ?? new Date().toISOString(),
    profilePictureUrl: apiData?.profilePictureUrl ?? null,
    themeId: apiData?.themeId ?? undefined,
    tenant: apiData?.tenant ?? null,
    community: apiData?.community ?? null,
    roles: apiData?.roles ?? [],
    badges: apiData?.badges ?? [],
    house: apiData?.house ?? null,
    residences: apiData?.residences ?? [],
    pendingJoinRequests: apiData?.pendingJoinRequests ?? [],
    pendingJoinRequest: apiData?.pendingJoinRequest ?? null,
  };
}

// ─── Relationship Transformers ────────────────────────────────────────────────

/**
 * Gets Indonesian label for a relationship type
 *
 * Business Rules:
 * - Map relationship code to Indonesian display label
 * - Return the code itself if no mapping exists (fail gracefully)
 *
 * @param type - Relationship type enum value
 * @returns Indonesian label string
 *
 * @example
 * getRelationshipLabel(RelationshipType.OWNER)  // => "Kepala Rumah Tangga"
 * getRelationshipLabel(RelationshipType.FAMILY) // => "Keluarga"
 */
export function getRelationshipLabel(type: RelationshipType): string {
  return RELATIONSHIP_LABELS[type] ?? type;
}

// ─── Residence Helpers ────────────────────────────────────────────────────────

/**
 * Gets the current residence from profile based on index
 *
 * Business Rules:
 * - Return residence at specified index if exists
 * - Return null if index is out of bounds
 * - Return null if profile has no residences array
 *
 * @param profile - User profile data
 * @param index - Zero-based residence index
 * @returns Selected residence or null
 *
 * @example
 * const residence = getCurrentResidence(profile, 0);
 */
export function getCurrentResidence(
  profile: ProfileData,
  index: number,
): ProfileResidence | null {
  if (!profile.residences || !Array.isArray(profile.residences)) {
    return null;
  }

  if (index < 0 || index >= profile.residences.length) {
    return null;
  }

  return profile.residences[index];
}

/**
 * Checks if the user is the household owner at a specific residence
 *
 * Business Rules:
 * - User is owner if they have a family member entry with relationship "OWNER"
 * - Check can be done on either profile.house or specific residence
 * - Return false if no house data available
 *
 * @param profile - User profile data
 * @param residenceIndex - Optional residence index (uses profile.house if not provided)
 * @returns true if user is household owner
 *
 * @example
 * const isOwner = isHouseholdOwner(profile, 0);
 * const isOwnerCurrent = isHouseholdOwner(profile); // Uses profile.house
 */
export function isHouseholdOwner(
  profile: ProfileData,
  residenceIndex?: number,
): boolean {
  let house: HouseInfo | null = null;

  // Get house from residence or profile.house
  if (residenceIndex !== undefined) {
    const residence = getCurrentResidence(profile, residenceIndex);
    house = residence?.house ?? null;
  } else {
    house = profile.house;
  }

  if (!house || !house.members || !Array.isArray(house.members)) {
    return false;
  }

  // Check if current user is the owner
  return house.members.some(
    (member: FamilyMember) =>
      member.userId === profile.id &&
      member.relationship === 'OWNER' &&
      member.isPrimary === true,
  );
}

// ─── Join Request Helpers ─────────────────────────────────────────────────────

/**
 * Filters pending join requests for a specific house
 *
 * Business Rules:
 * - Return only requests matching the specified house ID
 * - Return empty array if no pending requests exist
 * - Handle missing houseId in requests gracefully
 *
 * @param profile - User profile data
 * @param houseId - House ID to filter by
 * @returns Array of pending requests for the house
 *
 * @example
 * const requests = getPendingRequestsForHouse(profile, "house-123");
 */
export function getPendingRequestsForHouse(
  profile: ProfileData,
  houseId: string,
): PendingJoinRequestItem[] {
  if (!profile.pendingJoinRequests || !Array.isArray(profile.pendingJoinRequests)) {
    return [];
  }

  return profile.pendingJoinRequests.filter(
    (request) => request.houseId === houseId,
  );
}

// ─── House Formatting Helpers ─────────────────────────────────────────────────

/**
 * Formats house information into display string (e.g., "Blok - A-12")
 *
 * Business Rules:
 * - If house has blok_rumah, format as "Blok - {value}"
 * - If house is null or blok_rumah is empty, return fallback
 * - Handle various null/undefined scenarios gracefully
 *
 * @param house - House information object
 * @returns Formatted house display string
 *
 * @example
 * formatBlokRumah({ blok_rumah: "A-12", ... }) // => "Blok - A-12"
 * formatBlokRumah({ blok_rumah: null, ... })   // => "Blok —"
 * formatBlokRumah(null)                         // => "Blok —"
 */
export function formatBlokRumah(house: HouseInfo | null | undefined): string {
  if (!house || !house.blok_rumah || house.blok_rumah.trim() === '') {
    return `Blok ${DATE_CONFIG.FALLBACK_DISPLAY}`;
  }

  return `Blok - ${house.blok_rumah}`;
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Checks if a profile has valid and complete basic information
 *
 * Business Rules:
 * - Profile must have non-empty ID and fullName
 * - Optional fields can be null
 *
 * @param profile - Profile data to validate
 * @returns true if profile has minimum required data
 *
 * @example
 * if (isValidProfile(profile)) {
 *   // Safe to display profile
 * }
 */
export function isValidProfile(profile: ProfileData | null): profile is ProfileData {
  return (
    profile !== null &&
    typeof profile.id === 'string' &&
    profile.id.length > 0 &&
    typeof profile.fullName === 'string' &&
    profile.fullName.length > 0
  );
}

/**
 * Checks if a profile has any pending join requests
 *
 * @param profile - Profile data to check
 * @returns true if there are pending requests
 *
 * @example
 * if (hasPendingJoinRequests(profile)) {
 *   // Show join requests section
 * }
 */
export function hasPendingJoinRequests(profile: ProfileData): boolean {
  return (
    Array.isArray(profile.pendingJoinRequests) &&
    profile.pendingJoinRequests.length > 0
  );
}

/**
 * Checks if a profile has family members in their house
 *
 * @param profile - Profile data to check
 * @returns true if house has members
 *
 * @example
 * if (hasFamilyMembers(profile)) {
 *   // Show family members list
 * }
 */
export function hasFamilyMembers(profile: ProfileData): boolean {
  return (
    profile.house !== null &&
    Array.isArray(profile.house.members) &&
    profile.house.members.length > 0
  );
}

/**
 * Gets the count of family members excluding the user themselves
 *
 * @param profile - Profile data
 * @returns Number of other family members
 *
 * @example
 * const othersCount = getOtherFamilyMembersCount(profile); // => 3
 */
export function getOtherFamilyMembersCount(profile: ProfileData): number {
  if (!hasFamilyMembers(profile)) {
    return 0;
  }

  return profile.house!.members.filter(
    (member) => member.userId !== profile.id,
  ).length;
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

/**
 * Extracts form-editable fields from profile data
 *
 * Business Rules:
 * - Convert all fields to strings for form inputs
 * - Convert date to input format (YYYY-MM-DD)
 * - Use empty strings for null values
 *
 * @param profile - Profile data
 * @returns Object with form-ready values
 *
 * @example
 * const formData = extractEditableFields(profile);
 * // { fullName: "John Doe", username: "johndoe", ... }
 */
export function extractEditableFields(profile: ProfileData) {
  return {
    fullName: profile.fullName ?? '',
    username: profile.username ?? '',
    waNumber: profile.waNumber ?? '',
    email: profile.email ?? '',
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
  };
}

/**
 * Checks if form data has been modified from original profile
 *
 * @param original - Original profile data
 * @param current - Current form values
 * @returns true if any field has changed
 *
 * @example
 * const hasChanges = hasFormChanges(profile, formData);
 */
export function hasFormChanges(
  original: ProfileData,
  current: {
    fullName: string;
    username: string;
    waNumber: string;
    email: string;
    dateOfBirth: string;
  },
): boolean {
  const originalFields = extractEditableFields(original);

  return (
    originalFields.fullName !== current.fullName ||
    originalFields.username !== current.username ||
    originalFields.waNumber !== current.waNumber ||
    originalFields.email !== current.email ||
    originalFields.dateOfBirth !== current.dateOfBirth
  );
}
