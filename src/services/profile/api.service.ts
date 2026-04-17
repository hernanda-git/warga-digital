/**
 * Profile Page API Service
 *
 * Service layer for all profile page API interactions.
 * Following SOLID principles:
 * - Single Responsibility: Each function handles one specific API call
 * - Dependency Inversion: Depends on apiFetch abstraction, not fetch directly
 * - Interface Segregation: Clean, focused function signatures
 *
 * This layer separates API concerns from UI logic, making it easier to:
 * - Test API calls in isolation
 * - Mock responses for testing
 * - Change API implementations without affecting UI
 * - Add error handling, retry logic, caching in one place
 */

import { apiFetch } from '@/lib/api-client';
import { PROFILE_API_ENDPOINTS } from '@/config/profile';
import type {
  ProfileData,
  UpdateProfileRequest,
  CheckUsernameRequest,
  CheckWaNumberRequest,
  ChangePinRequest,
  UpdateThemeRequest,
  AddFamilyMemberRequest,
  TransferOwnershipRequest,
  RemoveFamilyMemberRequest,
  RespondJoinRequestRequest,
  AvailabilityCheckResponse,
  SuccessResponse,
} from '@/types/profile';

// ─── Result Type for Better Error Handling ────────────────────────────────────

/**
 * Generic result type for API operations
 * Inspired by Rust's Result type for explicit error handling
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Profile Service ──────────────────────────────────────────────────────────

/**
 * Fetches user profile data including personal info, residence, family members,
 * badges, and pending join requests
 *
 * @returns Profile data or error message
 *
 * @example
 * const result = await fetchProfile();
 * if (result.success) {
 *   console.log(result.data.fullName);
 *   console.log(result.data.house?.members);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function fetchProfile(): Promise<ApiResult<ProfileData>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Failed to fetch profile: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as ProfileData;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching profile',
    };
  }
}

/**
 * Updates user profile information
 * Supports partial updates - only send fields that need to be updated
 *
 * @param profileData - Updated profile fields (full_name, username, wa_number, email, date_of_birth)
 * @returns Updated profile data or error message
 *
 * @example
 * const result = await updateProfile({
 *   fullName: 'John Doe',
 *   username: 'johndoe',
 *   email: 'john@example.com'
 * });
 * if (result.success) {
 *   console.log('Profile updated:', result.data.profile);
 * }
 */
export async function updateProfile(
  profileData: {
    full_name?: string;
    username?: string | null;
    wa_number?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
  }
): Promise<ApiResult<{ profile: Partial<ProfileData> }>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to update profile',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating profile',
    };
  }
}

// ─── Validation Services ──────────────────────────────────────────────────────

/**
 * Checks if a username is available for use
 * Returns true if available, false if already taken
 *
 * @param username - Username to check
 * @returns Availability status or error message
 *
 * @example
 * const result = await checkUsernameAvailability('johndoe');
 * if (result.success && result.data.available) {
 *   console.log('Username is available');
 * } else if (result.success && !result.data.available) {
 *   console.log('Username is taken');
 * }
 */
export async function checkUsernameAvailability(
  username: string
): Promise<ApiResult<AvailabilityCheckResponse>> {
  try {
    if (!username.trim()) {
      return {
        success: false,
        error: 'Username cannot be empty',
      };
    }

    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHECK_USERNAME, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to check username availability',
      };
    }

    const data = await response.json() as AvailabilityCheckResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking username',
    };
  }
}

/**
 * Checks if a WhatsApp number is available for use
 * Returns true if available, false if already taken
 *
 * @param waNumber - WhatsApp number to check
 * @returns Availability status or error message
 *
 * @example
 * const result = await checkWaNumberAvailability('081234567890');
 * if (result.success && result.data.available) {
 *   console.log('WhatsApp number is available');
 * }
 */
export async function checkWaNumberAvailability(
  waNumber: string
): Promise<ApiResult<AvailabilityCheckResponse>> {
  try {
    if (!waNumber.trim()) {
      return {
        success: false,
        error: 'WhatsApp number cannot be empty',
      };
    }

    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHECK_WA_NUMBER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waNumber: waNumber.trim() }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to check WhatsApp number availability',
      };
    }

    const data = await response.json() as AvailabilityCheckResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking WhatsApp number',
    };
  }
}

// ─── Avatar Service ───────────────────────────────────────────────────────────

/**
 * Uploads a new profile avatar image
 * Accepts image files (JPEG, PNG, WebP, HEIC)
 * Maximum file size: 10MB
 *
 * @param file - Image file to upload
 * @returns Updated profile picture URL or error message
 *
 * @example
 * const file = document.querySelector('input[type="file"]').files[0];
 * const result = await uploadAvatar(file);
 * if (result.success) {
 *   console.log('New avatar URL:', result.data.profilePictureUrl);
 * }
 */
export async function uploadAvatar(
  file: File
): Promise<ApiResult<{ profilePictureUrl: string | null }>> {
  try {
    const formData = new FormData();
    formData.set('file', file);

    const response = await apiFetch(PROFILE_API_ENDPOINTS.AVATAR, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || (data.error && !data.profilePictureUrl)) {
      return {
        success: false,
        error: data.error || 'Failed to upload avatar',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error uploading avatar',
    };
  }
}

// ─── Authentication Services ──────────────────────────────────────────────────

/**
 * Changes the user's PIN
 * Requires current PIN for verification and new PIN confirmation
 *
 * @param currentPin - Current 4-digit PIN
 * @param newPin - New 4-digit PIN
 * @param confirmPin - Confirmation of new PIN
 * @returns Success message or error message
 *
 * @example
 * const result = await changePin('1234', '5678', '5678');
 * if (result.success) {
 *   console.log('PIN changed successfully');
 * } else {
 *   console.error('Failed to change PIN:', result.error);
 * }
 */
export async function changePin(
  currentPin: string,
  newPin: string,
  confirmPin: string
): Promise<ApiResult<SuccessResponse>> {
  try {
    // Validate PIN format
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      return {
        success: false,
        error: 'All PINs must be exactly 4 digits',
      };
    }

    if (newPin !== confirmPin) {
      return {
        success: false,
        error: 'New PIN and confirmation PIN do not match',
      };
    }

    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHANGE_PIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPin,
        newPin,
        confirmNewPin: confirmPin,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to change PIN',
      };
    }

    const data = await response.json() as SuccessResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error changing PIN',
    };
  }
}

/**
 * Logs out the current user
 * Clears session and authentication cookies
 *
 * @returns Success status or error message
 *
 * @example
 * const result = await logout();
 * if (result.success) {
 *   // Redirect to login page
 *   router.push('/auth/login');
 * }
 */
export async function logout(): Promise<ApiResult<void>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.LOGOUT, {
      method: 'POST',
    });

    // Logout should succeed even if the response is not ok
    // This ensures user can always log out
    return { success: true, data: undefined };
  } catch (error) {
    // Even on error, we return success to allow logout
    return { success: true, data: undefined };
  }
}

// ─── Appearance Service ───────────────────────────────────────────────────────

/**
 * Updates the user's selected theme
 * Changes the color scheme of the application
 *
 * @param themeId - Theme identifier (e.g., 'green', 'blue', 'purple')
 * @returns Success status or error message
 *
 * @example
 * const result = await updateTheme('blue');
 * if (result.success) {
 *   console.log('Theme updated successfully');
 * }
 */
export async function updateTheme(
  themeId: string
): Promise<ApiResult<{ profile: Partial<ProfileData> }>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_id: themeId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to update theme',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating theme',
    };
  }
}

// ─── Family Management Services ───────────────────────────────────────────────

/**
 * Adds a new family member to the household
 * The new member will be linked to the current house
 *
 * @param memberData - Family member information (fullName, username, waNumber, houseId)
 * @returns Success message or error message
 *
 * @example
 * const result = await addFamilyMember({
 *   fullName: 'Jane Doe',
 *   waNumber: '081234567890',
 *   houseId: 'house-123'
 * });
 * if (result.success) {
 *   console.log('Family member added');
 * }
 */
export async function addFamilyMember(memberData: {
  fullName: string;
  username?: string;
  waNumber: string;
  houseId?: string;
}): Promise<ApiResult<SuccessResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.FAMILY_ADD_MEMBER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: memberData.fullName.trim(),
        username: memberData.username?.trim() || undefined,
        waNumber: memberData.waNumber.trim(),
        ...(memberData.houseId && { houseId: memberData.houseId }),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to add family member',
      };
    }

    const data = await response.json() as SuccessResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding family member',
    };
  }
}

/**
 * Transfers household ownership to another family member
 * The current owner will become a regular family member
 *
 * @param houseId - House ID
 * @param newOwnerUserId - User ID of the new household owner
 * @returns Success message or error message
 *
 * @example
 * const result = await transferOwnership('house-123', 'user-456');
 * if (result.success) {
 *   console.log('Ownership transferred successfully');
 * }
 */
export async function transferOwnership(
  houseId: string,
  newOwnerUserId: string
): Promise<ApiResult<SuccessResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.FAMILY_TRANSFER_OWNER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, newOwnerUserId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to transfer ownership',
      };
    }

    const data = await response.json() as SuccessResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error transferring ownership',
    };
  }
}

/**
 * Removes a family member from the household
 * The member will be unlinked from the house
 *
 * @param houseId - House ID
 * @param memberUserId - User ID of the member to remove
 * @returns Success message or error message
 *
 * @example
 * const result = await removeFamilyMember('house-123', 'user-456');
 * if (result.success) {
 *   console.log('Family member removed');
 * }
 */
export async function removeFamilyMember(
  houseId: string,
  memberUserId: string
): Promise<ApiResult<SuccessResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.FAMILY_REMOVE_MEMBER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, memberUserId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to remove family member',
      };
    }

    const data = await response.json() as SuccessResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing family member',
    };
  }
}

// ─── Join Request Services ────────────────────────────────────────────────────

/**
 * Responds to a household join request (approve or reject)
 * Only household owners can respond to join requests
 *
 * @param requestId - Join request ID
 * @param action - Action to take: 'approve' or 'reject'
 * @returns Success message or error message
 *
 * @example
 * const result = await respondToJoinRequest('req-123', 'approve');
 * if (result.success) {
 *   console.log('Join request approved');
 * }
 */
export async function respondToJoinRequest(
  requestId: string,
  action: 'approve' | 'reject'
): Promise<ApiResult<SuccessResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.JOIN_REQUEST_RESPOND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Failed to respond to join request',
      };
    }

    const data = await response.json() as SuccessResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error responding to join request',
    };
  }
}

// ─── Batch Operations (Future Enhancement) ────────────────────────────────────

/**
 * Fetches all profile-related data in parallel
 * Currently only fetches profile, but can be extended to include
 * additional related data (notifications, activity, etc.)
 *
 * @returns Object containing profile result
 *
 * @example
 * const { profile } = await fetchAllProfileData();
 * if (profile.success) {
 *   console.log('Profile loaded:', profile.data);
 * }
 */
export async function fetchAllProfileData() {
  const [profile] = await Promise.allSettled([fetchProfile()]);

  return {
    profile:
      profile.status === 'fulfilled'
        ? profile.value
        : ({ success: false as const, error: 'Request failed' }),
  };
}
