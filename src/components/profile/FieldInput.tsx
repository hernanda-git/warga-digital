"use client";

import React from "react";
import { ValidationStatus } from "@/types/profile";
import { VALIDATION_RULES } from "@/config/profile";

interface FieldInputProps {
  /** Input type */
  type?: "text" | "tel" | "email" | "date" | "password" | "number";
  /** Input value */
  value: string;
  /** Change handler */
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** Error message to display */
  error?: string | null;
  /** Validation status for visual feedback */
  status?: ValidationStatus;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Input name attribute */
  name?: string;
  /** AutoComplete attribute */
  autoComplete?: string;
  /** Max length attribute */
  maxLength?: number;
  /** Pattern for validation */
  pattern?: string;
  /** Input mode for mobile keyboards */
  inputMode?: "text" | "numeric" | "tel" | "email";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Styled input component with validation state support
 * Displays error messages and validation status indicators
 *
 * @example
 * ```tsx
 * <FieldInput
 *   type="text"
 *   value={form.username}
 *   onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
 *   error={validationError}
 *   status={usernameCheckStatus}
 *   placeholder="Masukkan username"
 * />
 * ```
 */
export function FieldInput({
  type = "text",
  value,
  onChange,
  error,
  status = ValidationStatus.IDLE,
  placeholder,
  disabled = false,
  name,
  autoComplete,
  maxLength,
  pattern,
  inputMode,
  className = "",
}: FieldInputProps) {
  // Determine border color based on state
  const getBorderColor = () => {
    if (error) return "border-red-500 focus:border-red-500";
    if (status === ValidationStatus.AVAILABLE)
      return "border-green-500 focus:border-green-500";
    if (status === ValidationStatus.TAKEN)
      return "border-red-500 focus:border-red-500";
    if (status === ValidationStatus.ERROR)
      return "border-yellow-500 focus:border-yellow-500";
    return "border-gray-300 focus:border-primary";
  };

  // Determine background color when disabled
  const getBackgroundColor = () => {
    if (disabled) return "bg-gray-100 cursor-not-allowed";
    return "bg-white";
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        inputMode={inputMode}
        className={`
          w-full
          px-3 py-2
          text-sm
          rounded-lg
          border
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/20
          ${getBorderColor()}
          ${getBackgroundColor()}
          ${error ? "text-red-900" : "text-gray-900"}
          placeholder:text-gray-400
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />

      {/* Error Message */}
      {error && (
        <p
          id={`${name}-error`}
          className="mt-1 text-xs text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
