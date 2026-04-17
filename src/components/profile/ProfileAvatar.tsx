"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import { CameraIcon } from "@heroicons/react/24/outline";
import { Avatar } from "@/components/ui";

interface ProfileAvatarProps {
  /** Current profile picture URL */
  profilePictureUrl: string | null;
  /** User's full name for alt text and fallback */
  fullName: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Loading state when uploading */
  loading?: boolean;
  /** Whether the avatar is editable */
  editable?: boolean;
  /** File input ref from useAvatarUpload */
  fileInputRef?: React.RefObject<HTMLInputElement>;
  /** Handler for file selection */
  onFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Profile avatar component with optional upload functionality
 *
 * @example
 * ```tsx
 * <ProfileAvatar
 *   profilePictureUrl={profile.profilePictureUrl}
 *   fullName={profile.fullName}
 *   size="lg"
 *   editable
 *   fileInputRef={fileInputRef}
 *   onFileSelect={handleAvatarChange}
 * />
 * ```
 */
export function ProfileAvatar({
  profilePictureUrl,
  fullName,
  size = "md",
  loading = false,
  editable = false,
  fileInputRef,
  onFileSelect,
  className = "",
}: ProfileAvatarProps) {
  // Size mapping
  const sizeMap = {
    sm: 48,
    md: 80,
    lg: 120,
    xl: 160,
  };

  const dimension = sizeMap[size];

  // Handle click on avatar to trigger file input
  const handleAvatarClick = useCallback(() => {
    if (editable && fileInputRef?.current) {
      fileInputRef.current.click();
    }
  }, [editable, fileInputRef]);

  // Size classes
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-30 h-30",
    xl: "w-40 h-40",
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Avatar Container */}
      <div
        onClick={handleAvatarClick}
        className={`
          relative rounded-full overflow-hidden bg-gray-100
          ${editable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}
          ${loading ? "opacity-50" : ""}
        `}
        style={{ width: dimension, height: dimension }}
      >
        {profilePictureUrl ? (
          <Image
            src={profilePictureUrl}
            alt={`Foto profil ${fullName}`}
            width={dimension}
            height={dimension}
            className="object-cover w-full h-full"
            priority
          />
        ) : (
          <Avatar name={fullName} size={dimension} className="w-full h-full" />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
          </div>
        )}

        {/* Edit Overlay */}
        {editable && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <CameraIcon className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      {editable && fileInputRef && onFileSelect && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          aria-label="Unggah foto profil"
        />
      )}
    </div>
  );
}
