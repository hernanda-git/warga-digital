"use client";

import React from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileFieldDisplay } from "./ProfileFieldDisplay";
import {
  formatDate,
  getRelationshipLabel,
} from "@/services/profile/transformers";
import { RelationshipType, ProfileData } from "@/types/profile";

interface ProfileCardProps {
  /** Profile data to display */
  profile: ProfileData;
  /** Whether the profile is in edit mode */
  isEditing?: boolean;
  /** Edit form values */
  editForm?: {
    fullName: string;
    username: string;
    waNumber: string;
    email: string;
    dateOfBirth: string;
  };
  /** Callback when edit form field changes */
  onEditFormChange?: (field: string, value: string) => void;
  /** Username availability status */
  usernameCheckStatus?: "idle" | "available" | "taken" | "error";
  /** Username check loading state */
  usernameCheckLoading?: boolean;
  /** WA number availability status */
  waNumberCheckStatus?: "idle" | "available" | "taken" | "error";
  /** WA number check loading state */
  waNumberCheckLoading?: boolean;
  /** Validation error message */
  validationError?: string | null;
  /** Avatar file input ref */
  fileInputRef?: React.RefObject<HTMLInputElement>;
  /** Avatar file select handler */
  onAvatarSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Avatar upload loading state */
  avatarLoading?: boolean;
  /** Whether the current user is editable */
  editable?: boolean;
  /** Current user's relationship label */
  relationshipLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card component that displays user profile information
 * Supports both view and edit modes
 *
 * @example
 * ```tsx
 * // View mode
 * <ProfileCard profile={profile} />
 *
 * // Edit mode
 * <ProfileCard
 *   profile={profile}
 *   isEditing={true}
 *   editForm={editForm}
 *   onEditFormChange={handleFormChange}
 *   usernameCheckStatus={usernameCheckStatus}
 *   usernameCheckLoading={usernameCheckLoading}
 *   avatarLoading={avatarLoading}
 *   fileInputRef={fileInputRef}
 *   onAvatarSelect={handleAvatarChange}
 * />
 * ```
 */
export function ProfileCard({
  profile,
  isEditing = false,
  editForm,
  onEditFormChange,
  usernameCheckStatus = "idle",
  usernameCheckLoading = false,
  waNumberCheckStatus = "idle",
  waNumberCheckLoading = false,
  validationError = null,
  fileInputRef,
  onAvatarSelect,
  avatarLoading = false,
  editable = false,
  relationshipLabel,
  className = "",
}: ProfileCardProps) {
  // Get relationship label if not provided
  const displayRelationshipLabel =
    relationshipLabel ||
    (profile.house?.members?.find((m) => m.userId === profile.id)
      ? getRelationshipLabel(
          profile.house.members.find((m) => m.userId === profile.id)
            ?.relationship as RelationshipType,
        )
      : null);

  return (
    <div
      className={`
        bg-base-100 rounded-xl shadow-sm border border-base-300
        overflow-hidden
        ${className}
      `}
    >
      {/* Header with Avatar */}
      <div className="relative px-6 py-8 bg-gradient-to-br from-primary/5 to-primary/10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.05) 0%, transparent 50%),
                               radial-gradient(circle at 80% 50%, rgba(0,0,0,0.05) 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          {/* Avatar */}
          <ProfileAvatar
            profilePictureUrl={profile.profilePictureUrl}
            fullName={profile.fullName}
            size="xl"
            editable={editable && !isEditing}
            fileInputRef={fileInputRef}
            onFileSelect={onAvatarSelect}
            loading={avatarLoading}
          />

          {/* Name */}
          <h2 className="mt-4 text-xl font-bold text-base-content">
            {profile.fullName || "—"}
          </h2>

          {/* Username */}
          {profile.username && (
            <p className="mt-1 text-sm text-base-content/60">
              @{profile.username}
            </p>
          )}

          {/* Relationship Badge */}
          {displayRelationshipLabel && (
            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {displayRelationshipLabel}
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="px-6 py-6">
        {/* Validation Error */}
        {isEditing && validationError && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{validationError}</p>
          </div>
        )}

        <dl className="space-y-4">
          {/* Full Name */}
          <ProfileFieldDisplay
            label="Nama Lengkap"
            value={profile.fullName}
            placeholder="—"
            editing={isEditing}
            inputType="text"
            inputValue={editForm?.fullName ?? ""}
            onChange={(e) => onEditFormChange?.("fullName", e.target.value)}
          />

          {/* Username */}
          <ProfileFieldDisplay
            label="Username"
            value={profile.username}
            placeholder="Belum diatur"
            editing={isEditing}
            inputType="text"
            inputValue={editForm?.username ?? ""}
            onChange={(e) => onEditFormChange?.("username", e.target.value)}
            showAvailabilityStatus={isEditing}
            availabilityStatus={usernameCheckStatus}
            loading={usernameCheckLoading}
            error={validationError ?? undefined}
          />

          {/* WhatsApp Number */}
          <ProfileFieldDisplay
            label="Nomor WhatsApp"
            value={profile.waNumberMasked || profile.waNumber}
            placeholder="Belum diatur"
            editing={isEditing}
            inputType="tel"
            inputValue={editForm?.waNumber ?? ""}
            onChange={(e) => onEditFormChange?.("waNumber", e.target.value)}
            showAvailabilityStatus={isEditing}
            availabilityStatus={waNumberCheckStatus}
            loading={waNumberCheckLoading}
            error={validationError ?? undefined}
          />

          {/* Email */}
          <ProfileFieldDisplay
            label="Email"
            value={profile.email}
            placeholder="Belum diatur"
            editing={isEditing}
            inputType="email"
            inputValue={editForm?.email ?? ""}
            onChange={(e) => onEditFormChange?.("email", e.target.value)}
          />

          {/* Date of Birth */}
          <ProfileFieldDisplay
            label="Tanggal Lahir"
            value={formatDate(profile.dateOfBirth)}
            placeholder="—"
            editing={isEditing}
            inputType="date"
            inputValue={editForm?.dateOfBirth ?? ""}
            onChange={(e) => onEditFormChange?.("dateOfBirth", e.target.value)}
          />

          {/* Member Since */}
          {!isEditing && (
            <ProfileFieldDisplay
              label="Member Seit"
              value={formatDate(profile.createdAt)}
              placeholder="—"
            />
          )}
        </dl>
      </div>
    </div>
  );
}
