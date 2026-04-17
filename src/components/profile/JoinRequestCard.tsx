"use client";

import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { formatDate } from "@/services/profile/transformers";
import {
  RELATIONSHIP_LABELS,
  UI_CONFIG,
  type JoinRequestAction,
} from "@/config/profile";
import type { PendingJoinRequestItem } from "@/types/profile";

interface JoinRequestCardProps {
  /** The join request data to display */
  request: PendingJoinRequestItem;
  /** Whether this request is currently being responded to */
  isResponding?: boolean;
  /** Callback when user clicks approve */
  onApprove?: (requestId: string) => void;
  /** Callback when user clicks reject */
  onReject?: (requestId: string) => void;
  /** Whether approve button is disabled */
  approveDisabled?: boolean;
  /** Whether reject button is disabled */
  rejectDisabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card component for displaying a pending join request
 * Shows requester info and approve/reject actions
 *
 * @example
 * ```tsx
 * <JoinRequestCard
 *   request={pendingRequest}
 *   isResponding={respondingRequestId === request.id}
 *   onApprove={() => handleRespond(request.id, "approve")}
 *   onReject={() => handleRespond(request.id, "reject")}
 * />
 * ```
 */
export function JoinRequestCard({
  request,
  isResponding = false,
  onApprove,
  onReject,
  approveDisabled = false,
  rejectDisabled = false,
  className = "",
}: JoinRequestCardProps) {
  const { id, requesterFullName, blokRumah, createdAt } = request;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800
        rounded-lg
        border border-gray-200 dark:border-gray-700
        p-4
        transition-all duration-200
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {requesterFullName}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {blokRumah || "—"}
          </p>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDate(createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {/* Approve Button */}
        <button
          type="button"
          onClick={() => onApprove?.(id)}
          disabled={isResponding || approveDisabled}
          className={`
            flex-1
            flex items-center justify-center gap-1.5
            px-3 py-2
            text-sm font-medium
            rounded-md
            transition-colors duration-200
            ${
              isResponding
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            }
          `}
          aria-label={`Terima permintaan dari ${requesterFullName}`}
        >
          <CheckIcon className="w-4 h-4" />
          {isResponding ? "Memproses..." : "Terima"}
        </button>

        {/* Reject Button */}
        <button
          type="button"
          onClick={() => onReject?.(id)}
          disabled={isResponding || rejectDisabled}
          className={`
            flex-1
            flex items-center justify-center gap-1.5
            px-3 py-2
            text-sm font-medium
            rounded-md
            transition-colors duration-200
            ${
              isResponding
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            }
          `}
          aria-label={`Tolak permintaan dari ${requesterFullName}`}
        >
          <XMarkIcon className="w-4 h-4" />
          {isResponding ? "Memproses..." : "Tolak"}
        </button>
      </div>
    </div>
  );
}

/**
 * Empty state when there are no pending join requests
 */
export function JoinRequestCardEmpty({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        text-center py-6 px-4
        bg-gray-50 dark:bg-gray-800/50
        rounded-lg border border-dashed border-gray-300 dark:border-gray-600
        ${className}
      `}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Tidak ada permintaan bergabung yang tertunda
      </p>
    </div>
  );
}

/**
 * Skeleton loader for JoinRequestCard
 */
export function JoinRequestCardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800
        rounded-lg
        border border-gray-200 dark:border-gray-700
        p-4
        animate-pulse
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
    </div>
  );
}
