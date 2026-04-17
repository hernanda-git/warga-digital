"use client";

import { useState, useCallback } from "react";
import {
  respondToJoinRequest as respondToJoinRequestApi,
} from "@/services/profile/api.service";
import {
  PROFILE_ERROR_MESSAGES,
  JOIN_REQUEST_ACTIONS,
  JoinRequestAction,
} from "@/config/profile";
import type {
  ProfileData,
  PendingJoinRequestItem,
  RequestId,
} from "@/types/profile";

interface UseJoinRequestsOptions {
  profile: ProfileData | null;
  houseId: string | null;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseJoinRequestsReturn {
  // State
  respondingRequestId: string | null;
  respondError: string | null;

  // Computed
  pendingForCurrentHouse: PendingJoinRequestItem[];
  hasPendingRequests: boolean;

  // Actions
  handleRespondToJoinRequest: (
    requestId: string,
    action: JoinRequestAction
  ) => Promise<void>;
  clearRespondError: () => void;
}

/**
 * Hook for managing house join requests
 * Handles approving and rejecting join requests from users wanting to join the household
 *
 * @example
 * ```tsx
 * const {
 *   pendingForCurrentHouse,
 *   handleRespondToJoinRequest,
 *   respondingRequestId,
 * } = useJoinRequests({
 *   profile,
 *   houseId,
 *   onSuccess: () => refreshProfile(),
 * });
 * ```
 */
export function useJoinRequests(
  options: UseJoinRequestsOptions
): UseJoinRequestsReturn {
  const { profile, houseId, onSuccess, onError } = options;

  // State
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(
    null
  );
  const [respondError, setRespondError] = useState<string | null>(null);

  /**
   * Get pending join requests filtered for the current house
   */
  const getPendingForCurrentHouse = useCallback((): PendingJoinRequestItem[] => {
    if (!profile?.pendingJoinRequests) return [];

    // If we have a specific houseId, filter by it
    if (houseId) {
      return profile.pendingJoinRequests.filter(
        (request) => request.houseId === houseId || !request.houseId
      );
    }

    // Otherwise return all pending requests
    return profile.pendingJoinRequests;
  }, [profile, houseId]);

  const pendingForCurrentHouse = getPendingForCurrentHouse();
  const hasPendingRequests = pendingForCurrentHouse.length > 0;

  /**
   * Respond to a join request (approve or reject)
   */
  const handleRespondToJoinRequest = useCallback(
    async (requestId: string, action: JoinRequestAction) => {
      // Validate action
      const validActions = Object.values(JOIN_REQUEST_ACTIONS) as readonly string[];
      if (!validActions.includes(action)) {
        setRespondError(PROFILE_ERROR_MESSAGES.INVALID_ACTION);
        return;
      }

      setRespondError(null);
      setRespondingRequestId(requestId);

      try {
        const result = await respondToJoinRequestApi(
          requestId as RequestId,
          action
        );

        if (!result.success) {
          const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.RESPOND_REQUEST_FAILED;
          setRespondError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        onSuccess?.();
      } catch (error) {
        const errorMsg = PROFILE_ERROR_MESSAGES.RESPOND_REQUEST_FAILED;
        setRespondError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setRespondingRequestId(null);
      }
    },
    [onSuccess, onError]
  );

  /**
   * Clear respond error
   */
  const clearRespondError = useCallback(() => {
    setRespondError(null);
  }, []);

  return {
    // State
    respondingRequestId,
    respondError,

    // Computed
    pendingForCurrentHouse,
    hasPendingRequests,

    // Actions
    handleRespondToJoinRequest,
    clearRespondError,
  };
}
