"use client";

import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { UI_CONFIG, DIALOG_CONFIG } from "@/config/profile";
import type { ConfirmDialogState } from "@/types/profile";

interface ConfirmDialogProps {
  /** Dialog state with title, message, and confirm callback */
  dialog: ConfirmDialogState | null;
  /** Whether the confirm action is loading */
  loading?: boolean;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Callback when confirm is clicked */
  onConfirm: () => void;
}

/**
 * Confirmation dialog component for destructive and important actions
 * Displays a modal with title, message, and confirm/cancel buttons
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   dialog={confirmDialog}
 *   loading={confirmLoading}
 *   onCancel={closeConfirmDialog}
 *   onConfirm={handleConfirmAction}
 * />
 * ```
 */
export function ConfirmDialog({
  dialog,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  // Don't render if no dialog state
  if (!dialog) return null;

  const { title, message, confirmLabel, danger } = dialog;

  return (
    <Teleport to="body">
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={onCancel}
          aria-hidden="true"
        />

        {/* Dialog Panel */}
        <div
          className={`
            relative bg-base-100 rounded-2xl shadow-2xl
            w-full max-w-sm
            animate-slide-up
            ${danger ? "border border-error/30" : ""}
          `}
          style={{
            animationDuration: UI_CONFIG.ANIMATIONS.DIALOG_IN_DURATION,
          }}
        >
          {/* Danger Icon Header */}
          {danger && (
            <div className="flex justify-center pt-6">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-error" />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 text-center">
            {/* Title */}
            <h3
              id="confirm-dialog-title"
              className={`text-lg font-semibold mb-2 ${
                danger ? "text-error" : "text-base-content"
              }`}
            >
              {title}
            </h3>

            {/* Message */}
            <p
              id="confirm-dialog-message"
              className="text-sm text-base-content/70"
            >
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={`
                flex-1 px-4 py-2.5
                text-sm font-medium
                rounded-xl
                transition-colors duration-200
                ${
                  danger
                    ? "bg-base-200 hover:bg-base-300 text-base-content"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Batal
            </button>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`
                flex-1 px-4 py-2.5
                text-sm font-medium
                rounded-xl
                transition-colors duration-200
                ${
                  danger
                    ? "bg-error hover:bg-error/90 text-error-content"
                    : "bg-primary hover:bg-primary/90 text-primary-content"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Memproses...
                </span>
              ) : (
                confirmLabel || "Konfirmasi"
              )}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  );
}

/**
 * Helper to teleported element since Next.js might not have the component
 */
function Teleport({ to, children }: { to: string; children: React.ReactNode }) {
  // Simple implementation - in real app use proper portal
  return <>{children}</>;
}
