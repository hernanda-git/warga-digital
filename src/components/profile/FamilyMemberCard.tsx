"use client";

import React from "react";
import {
  ShieldCheckIcon,
  UserMinusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Avatar } from "@/components/ui";
import { RELATIONSHIP_LABELS, FAMILY_MEMBER_LABELS } from "@/config/profile";
import { RelationshipType } from "@/types/profile";
import { getRelationshipLabel } from "@/services/profile/transformers";

interface FamilyMemberCardProps {
  /** Family member data */
  member: {
    userId: string;
    fullName: string;
    username: string | null;
    relationship: string;
    isPrimary: boolean;
  };
  /** Whether this member is the current user */
  isCurrentUser?: boolean;
  /** Whether this member is the household owner */
  isOwner?: boolean;
  /** Whether this card is in loading state for transfer action */
  transferLoading?: boolean;
  /** Whether this card is in loading state for remove action */
  removeLoading?: boolean;
  /** Callback when transfer owner button is clicked */
  onTransferOwner?: (userId: string) => void;
  /** Callback when remove member button is clicked */
  onRemoveMember?: (userId: string) => void;
  /** Whether the current user can manage family (is owner) */
  canManage?: boolean;
}

/**
 * Card component for displaying a family member with actions
 *
 * @example
 * ```tsx
 * <FamilyMemberCard
 *   member={member}
 *   isOwner={member.relationship === "OWNER"}
 *   canManage={isHouseholdOwner}
 *   onTransferOwner={handleTransferOwner}
 *   onRemoveMember={handleRemoveMember}
 *   transferLoading={transferLoadingId === member.userId}
 *   removeLoading={removeLoadingId === member.userId}
 * />
 * ```
 */
export function FamilyMemberCard({
  member,
  isCurrentUser = false,
  isOwner = false,
  transferLoading = false,
  removeLoading = false,
  onTransferOwner,
  onRemoveMember,
  canManage = false,
}: FamilyMemberCardProps) {
  const { userId, fullName, username, relationship } = member;

  const relationshipLabel = getRelationshipLabel(
    relationship as RelationshipType,
  );
  const isLoading = transferLoading || removeLoading;

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border transition-all
        ${
          isOwner
            ? "bg-primary/5 border-primary/20"
            : "bg-base-100 border-base-300 hover:border-base-300/80"
        }
        ${isCurrentUser ? "ring-2 ring-primary/30" : ""}
        ${isLoading ? "opacity-70 pointer-events-none" : ""}
      `}
    >
      {/* Avatar with owner badge */}
      <div className="relative flex-shrink-0">
        <Avatar
          name={fullName}
          src={null}
          size={40}
          className={isOwner ? "ring-2 ring-primary/50" : ""}
        />
        {isOwner && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-content rounded-full p-1">
            <ShieldCheckIcon className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Member Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">
            {fullName}
            {isCurrentUser && (
              <span className="ml-1 text-xs text-primary">(Anda)</span>
            )}
          </span>
        </div>

        {/* Username */}
        {username && (
          <p className="text-xs text-base-content/60 mt-0.5">@{username}</p>
        )}

        {/* Relationship badge */}
        <div className="mt-2">
          <span
            className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
              ${
                isOwner
                  ? "bg-primary/10 text-primary"
                  : "bg-base-300/50 text-base-content/70"
              }
            `}
          >
            {relationshipLabel}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canManage && !isCurrentUser && !isOwner && (
        <div className="flex flex-col gap-1">
          {/* Transfer Owner Button */}
          {onTransferOwner && (
            <button
              type="button"
              onClick={() => onTransferOwner(userId)}
              disabled={isLoading}
              className="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
              title={FAMILY_MEMBER_LABELS.TRANSFER_OWNER_TITLE}
            >
              {transferLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheckIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Remove Member Button */}
          {onRemoveMember && (
            <button
              type="button"
              onClick={() => onRemoveMember(userId)}
              disabled={isLoading}
              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
              title={FAMILY_MEMBER_LABELS.REMOVE_MEMBER_TITLE}
            >
              {removeLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <UserMinusIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Owner badge */}
      {isOwner && !canManage && (
        <div className="flex-shrink-0">
          <ShieldCheckIcon className="w-5 h-5 text-primary" />
        </div>
      )}
    </div>
  );
}
