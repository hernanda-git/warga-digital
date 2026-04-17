/**
 * Profile Type Definitions
 *
 * Comprehensive type system for user profile management including:
 * - Core profile data structures
 * - Family and household relationships
 * - Residence management
 * - Join requests
 * - UI state management
 * - API request/response types
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * User ID branded type for stronger type safety
 */
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * House ID branded type for stronger type safety
 */
export type HouseId = string & { readonly __brand: 'HouseId' };

/**
 * Tenant ID branded type for stronger type safety
 */
export type TenantId = string & { readonly __brand: 'TenantId' };

/**
 * Community ID branded type for stronger type safety
 */
export type CommunityId = string & { readonly __brand: 'CommunityId' };

/**
 * Request ID branded type for stronger type safety
 */
export type RequestId = string & { readonly __brand: 'RequestId' };

// ============================================================================
// Enums
// ============================================================================

/**
 * Relationship types for household members
 */
export enum RelationshipType {
  OWNER = 'OWNER',
  FAMILY = 'FAMILY',
  TENANT = 'TENANT',
  CARETAKER = 'CARETAKER',
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

/**
 * Validation status for form fields
 */
export enum ValidationStatus {
  IDLE = 'idle',
  AVAILABLE = 'available',
  TAKEN = 'taken',
  ERROR = 'error',
}

/**
 * Join request status
 */
export enum JoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ============================================================================
// Core Profile Types
// ============================================================================

/**
 * User role within a tenant/community
 */
export interface ProfileRole {
  /** Role ID */
  id: number;
  /** Role name (e.g., "Admin", "User") */
  name: string;
  /** Optional role description */
  description: string | null;
}

/**
 * Achievement badge earned by the user
 */
export interface ProfileBadge {
  /** Badge ID */
  id: number;
  /** Unique badge code */
  code: string;
  /** Display name of the badge */
  name: string;
  /** Optional badge description */
  description: string | null;
  /** Icon identifier or URL */
  icon: string;
  /** ISO 8601 timestamp when badge was earned */
  earnedAt: string;
}

/**
 * Tenant/organization information
 */
export interface TenantInfo {
  /** Tenant ID */
  id: string;
  /** Tenant display name */
  name: string;
}

/**
 * Community information within a tenant
 */
export interface CommunityInfo {
  /** Community ID */
  id: string;
  /** Community code */
  code: string;
  /** Community display name */
  name: string | null;
}

// ============================================================================
// Family & Household Types
// ============================================================================

/**
 * Member of a household/family
 */
export interface FamilyMember {
  /** User ID of the family member */
  userId: string;
  /** Full name of the member */
  fullName: string;
  /** Username (optional) */
  username: string | null;
  /** Relationship type to the household */
  relationship: string;
  /** Whether this member is the primary household head */
  isPrimary: boolean;
}

/**
 * House/residence information with members
 */
export interface HouseInfo {
  /** House ID (optional if user has no house) */
  houseId?: string;
  /** Block and house number (e.g., "A-12") */
  blok_rumah: string | null;
  /** Full address of the house */
  address: string | null;
  /** House name or identifier */
  name: string;
  /** List of household members */
  members: FamilyMember[];
}

/**
 * Complete residence information including tenant, community, and house
 */
export interface ProfileResidence {
  /** Tenant information */
  tenant: TenantInfo;
  /** Community information */
  community: CommunityInfo;
  /** House information with members */
  house: HouseInfo;
  /** Whether this is the user's primary residence */
  isPrimary: boolean;
  /** User's roles in this residence */
  roles: ProfileRole[];
}

// ============================================================================
// Join Request Types
// ============================================================================

/**
 * Incoming join request from another user (for household owners)
 */
export interface PendingJoinRequestItem {
  /** Request ID */
  id: string;
  /** House ID being requested to join */
  houseId?: string;
  /** Full name of the person requesting to join */
  requesterFullName: string;
  /** Block and house number */
  blokRumah: string;
  /** ISO 8601 timestamp when request was created */
  createdAt: string;
}

/**
 * Outgoing join request status (for users requesting to join)
 */
export interface PendingJoinRequestRequester {
  /** Block and house number being requested */
  blokRumah: string;
  /** Full name of the household owner */
  ownerFullName: string;
  /** Status of the request */
  status: string;
}

// ============================================================================
// Main Profile Data Type
// ============================================================================

/**
 * Complete user profile data
 */
export interface ProfileData {
  /** User ID */
  id: string;
  /** User's full name */
  fullName: string;
  /** Username (optional, must be unique) */
  username: string | null;
  /** WhatsApp number (optional, must be unique) */
  waNumber: string | null;
  /** Masked WhatsApp number for display */
  waNumberMasked: string | null;
  /** Email address (optional) */
  email: string | null;
  /** Date of birth in ISO 8601 format */
  dateOfBirth: string | null;
  /** Account status */
  status: string;
  /** ISO 8601 timestamp when account was created */
  createdAt: string;
  /** Profile picture URL */
  profilePictureUrl: string | null;
  /** Selected theme ID */
  themeId?: string;
  /** Current tenant (for single-residence mode) */
  tenant?: TenantInfo | null;
  /** Current community (for single-residence mode) */
  community?: CommunityInfo | null;
  /** User's roles (for single-residence mode) */
  roles?: ProfileRole[];
  /** Earned badges */
  badges?: ProfileBadge[];
  /** Current house (for single-residence mode) */
  house: HouseInfo | null;
  /** All residences (for multi-residence support) */
  residences?: ProfileResidence[];
  /** Pending join requests received (if user is household owner) */
  pendingJoinRequests?: PendingJoinRequestItem[];
  /** Pending join request sent (if user is requesting to join) */
  pendingJoinRequest?: PendingJoinRequestRequester | null;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Confirmation dialog state
 */
export interface ConfirmDialogState {
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Label for confirm button */
  confirmLabel: string;
  /** Whether this is a dangerous action (shows red styling) */
  danger?: boolean;
  /** Async function to execute on confirmation */
  onConfirm: () => Promise<void>;
}

/**
 * Form edit state for profile fields
 */
export interface ProfileEditFormState {
  /** Edited full name */
  fullName: string;
  /** Edited username */
  username: string;
  /** Edited WhatsApp number */
  waNumber: string;
  /** Edited email address */
  email: string;
  /** Edited date of birth (YYYY-MM-DD format) */
  dateOfBirth: string;
}

/**
 * Field validation state
 */
export interface FieldValidationState {
  /** Whether validation is in progress */
  isLoading: boolean;
  /** Current validation status */
  status: ValidationStatus;
}

/**
 * Form validation state for all fields
 */
export interface ValidationState {
  /** Username validation */
  username: FieldValidationState;
  /** WhatsApp number validation */
  waNumber: FieldValidationState;
  /** General validation error message */
  error: string | null;
}

/**
 * PIN change form state
 */
export interface PinChangeFormState {
  /** Current PIN */
  currentPin: string;
  /** New PIN */
  newPin: string;
  /** Confirmation of new PIN */
  confirmNewPin: string;
}

/**
 * Add family member form state
 */
export interface AddFamilyMemberFormState {
  /** Full name of new member */
  fullName: string;
  /** Username of new member */
  username: string;
  /** WhatsApp number of new member */
  waNumber: string;
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for profile update
 */
export interface UpdateProfileRequest {
  /** Updated full name */
  fullName?: string;
  /** Updated username */
  username?: string;
  /** Updated WhatsApp number */
  waNumber?: string;
  /** Updated email address */
  email?: string;
  /** Updated date of birth (ISO 8601) */
  dateOfBirth?: string | null;
}

/**
 * Request body for username availability check
 */
export interface CheckUsernameRequest {
  /** Username to check */
  username: string;
}

/**
 * Request body for WhatsApp number availability check
 */
export interface CheckWaNumberRequest {
  /** WhatsApp number to check */
  waNumber: string;
}

/**
 * Request body for PIN change
 */
export interface ChangePinRequest {
  /** Current PIN for verification */
  currentPin: string;
  /** New PIN to set */
  newPin: string;
}

/**
 * Request body for theme update
 */
export interface UpdateThemeRequest {
  /** Theme ID to apply */
  themeId: string;
}

/**
 * Request body for adding a family member
 */
export interface AddFamilyMemberRequest {
  /** Full name of new member */
  fullName: string;
  /** Username of new member (optional) */
  username?: string;
  /** WhatsApp number of new member (optional) */
  waNumber?: string;
  /** Relationship type */
  relationship?: RelationshipType;
}

/**
 * Request body for removing a family member
 */
export interface RemoveFamilyMemberRequest {
  /** User ID of member to remove */
  userId: string;
}

/**
 * Request body for transferring household ownership
 */
export interface TransferOwnershipRequest {
  /** User ID of new owner */
  newOwnerId: string;
}

/**
 * Request body for responding to join request
 */
export interface RespondJoinRequestRequest {
  /** Request ID */
  requestId: string;
  /** Whether to accept the request */
  accept: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for availability check
 */
export interface AvailabilityCheckResponse {
  /** Whether the value is available */
  available: boolean;
}

/**
 * Generic success response
 */
export interface SuccessResponse {
  /** Success message */
  message: string;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Optional error details */
  details?: Record<string, unknown>;
}

/**
 * Profile response (same as ProfileData)
 */
export type ProfileResponse = ProfileData;

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for page hero component
 */
export interface PageHeroProps {
  /** Breadcrumb text */
  breadcrumb: string;
  /** Page title */
  title: string;
  /** Back button handler */
  onBack: () => void;
  /** Optional right slot content */
  rightSlot?: React.ReactNode;
}

/**
 * Props for info row component
 */
export interface InfoRowProps {
  /** Label text */
  label: string;
  /** Value to display */
  value: React.ReactNode;
  /** Whether this is the last row (no border) */
  isLast?: boolean;
}

/**
 * Props for field input component
 */
export interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label: string;
  /** Field ID */
  id: string;
  /** Whether field is optional */
  optional?: boolean;
}

/**
 * Props for confirm dialog component
 */
export interface ConfirmDialogProps {
  /** Dialog state (null if closed) */
  state: ConfirmDialogState | null;
  /** Whether confirm action is loading */
  loading: boolean;
  /** Close handler */
  onClose: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Relationship labels mapping
 */
export type RelationshipLabels = Record<RelationshipType, string>;

/**
 * Loading state for specific entity by ID
 */
export type LoadingById = string | null;

/**
 * Selected residence index
 */
export type ResidenceIndex = number;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if a string is a valid RelationshipType
 */
export function isRelationshipType(value: string): value is RelationshipType {
  return Object.values(RelationshipType).includes(value as RelationshipType);
}

/**
 * Type guard for checking if a string is a valid ValidationStatus
 */
export function isValidationStatus(value: string): value is ValidationStatus {
  return Object.values(ValidationStatus).includes(value as ValidationStatus);
}

/**
 * Type guard for checking if ProfileData has residences
 */
export function hasResidences(profile: ProfileData): profile is ProfileData & { residences: ProfileResidence[] } {
  return Array.isArray(profile.residences) && profile.residences.length > 0;
}

/**
 * Type guard for checking if ProfileData has a house
 */
export function hasHouse(profile: ProfileData): profile is ProfileData & { house: HouseInfo } {
  return profile.house !== null && profile.house !== undefined;
}

/**
 * Type guard for checking if user is household owner
 */
export function isHouseholdOwner(member: FamilyMember): boolean {
  return member.relationship === RelationshipType.OWNER && member.isPrimary;
}
