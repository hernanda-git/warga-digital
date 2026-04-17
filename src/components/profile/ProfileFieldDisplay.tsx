"use client";

import React from "react";
import { FieldInput } from "./FieldInput";
import { ValidationStatus } from "@/types/profile";

interface ProfileFieldDisplayProps {
  /** Field label */
  label: string;
  /** Field value to display */
  value: string | null | undefined;
  /** Placeholder when value is empty */
  placeholder?: string;
  /** Whether the field is being edited */
  editing?: boolean;
  /** Edit mode input type */
  inputType?: "text" | "tel" | "email" | "date";
  /** Edit mode input value */
  inputValue?: string;
  /** Edit mode onChange handler */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Edit mode error state */
  error?: string;
  /** Edit mode loading state */
  loading?: boolean;
  /** Show check icon for available status */
  showAvailabilityStatus?: boolean;
  /** Availability status: available, taken, loading, error */
  availabilityStatus?: "idle" | "available" | "taken" | "error";
  /** Icon to display alongside value */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable profile field display component
 * Shows field in view mode or edit mode based on `editing` prop
 *
 * @example
 * ```tsx
 * // View mode
 * <ProfileFieldDisplay
 *   label="Nama Lengkap"
 *   value={profile.fullName}
 *   placeholder="—"
 * />
 *
 * // Edit mode with validation
 * <ProfileFieldDisplay
 *   label="Username"
 *   editing={isEditing}
 *   inputType="text"
 *   inputValue={form.username}
 *   onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
 *   showAvailabilityStatus
 *   availabilityStatus={usernameCheckStatus}
 *   error={validationError}
 * />
 * ```
 */
export function ProfileFieldDisplay({
  label,
  value,
  placeholder = "—",
  editing = false,
  inputType = "text",
  inputValue = "",
  onChange,
  error,
  loading = false,
  showAvailabilityStatus = false,
  availabilityStatus = "idle",
  icon,
  className = "",
}: ProfileFieldDisplayProps) {
  // Determine display status for availability indicators
  const getStatusColor = () => {
    switch (availabilityStatus) {
      case "available":
        return "text-green-600";
      case "taken":
        return "text-red-600";
      case "error":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    if (loading || availabilityStatus === "idle") return null;

    if (availabilityStatus === "available") {
      return (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    }

    if (availabilityStatus === "taken") {
      return (
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    }

    return null;
  };

  return (
    <div className={`${className}`}>
      {/* Label */}
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>

      {/* View Mode */}
      {!editing && (
        <dd className="flex items-center gap-2 text-gray-900">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className={!value ? "text-gray-400" : ""}>
            {value || placeholder}
          </span>
        </dd>
      )}

      {/* Edit Mode */}
      {editing && (
        <dd className="mt-1">
          <FieldInput
            type={inputType}
            value={inputValue}
            onChange={onChange ?? (() => {})}
            error={error}
            status={availabilityStatus as ValidationStatus}
          />

          {/* Availability Status Indicator */}
          {showAvailabilityStatus && (
            <div className="flex items-center gap-1 mt-1">
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {!loading && getStatusIcon()}
              {!loading && availabilityStatus === "taken" && (
                <span className="text-xs text-red-600">
                  {inputType === "text" ? "Username" : "Nomor WhatsApp"} sudah
                  digunakan
                </span>
              )}
              {!loading && availabilityStatus === "available" && (
                <span className="text-xs text-green-600">
                  {inputType === "text" ? "Username" : "Nomor WhatsApp"}{" "}
                  tersedia
                </span>
              )}
            </div>
          )}
        </dd>
      )}
    </div>
  );
}
