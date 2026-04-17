"use client";

import { useState, useCallback } from "react";
import type { ConfirmDialogState } from "@/types/profile";

interface UseConfirmDialogReturn {
  // Dialog state
  confirmDialog: ConfirmDialogState | null;
  confirmLoading: boolean;

  // Actions
  openConfirmDialog: (state: Omit<ConfirmDialogState, "onConfirm"> & {
    onConfirm: ConfirmDialogState["onConfirm"];
  }) => void;
  closeConfirmDialog: () => void;
  setConfirmLoading: (loading: boolean) => void;
}

/**
 * Hook for managing confirmation dialogs
 * Provides a clean interface for showing and handling confirmation dialogs
 *
 * @example
 * ```tsx
 * const {
 *   confirmDialog,
 *   confirmLoading,
 *   openConfirmDialog,
 *   closeConfirmDialog,
 * } = useConfirmDialog();
 *
 * // Open a confirmation dialog
 * openConfirmDialog({
 *   title: "Konfirmasi Hapus?",
 *   message: "Data akan dihapus permanen",
 *   confirmLabel: "Ya, Hapus",
 *   danger: true,
 *   onConfirm: async () => {
 *     await deleteItem(id);
 *     closeConfirmDialog();
 *   },
 * });
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  /**
   * Open a confirmation dialog with the given state
   */
  const openConfirmDialog = useCallback(
    (state: Omit<ConfirmDialogState, "onConfirm"> & {
      onConfirm: ConfirmDialogState["onConfirm"];
    }) => {
      setConfirmDialog({
        title: state.title,
        message: state.message,
        confirmLabel: state.confirmLabel,
        danger: state.danger,
        onConfirm: state.onConfirm,
      });
    },
    []
  );

  /**
   * Close the confirmation dialog
   */
  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
    setConfirmLoading(false);
  }, []);

  return {
    confirmDialog,
    confirmLoading,
    openConfirmDialog,
    closeConfirmDialog,
    setConfirmLoading,
  };
}
