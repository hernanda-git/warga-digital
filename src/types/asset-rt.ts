/**
 * Type definitions for Aset RT (Neighborhood Asset) module
 *
 * Simplified schema:
 *   - is_used: boolean | null  → true=Digunakan, false=Tidak Digunakan, null=Tidak Terpakai
 *   - No condition or maintenance tracking
 *   - Category colour is dynamic (theming), not stored in DB
 *   - No icon on categories; image_url on asset for photo
 */

export interface AssetCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface AssetItem {
  id: string;
  tenant_id: string;
  community_id: string;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  category_id: string | null;
  category: AssetCategory | null;
  quantity: number;
  unit_label: string;
  is_used: boolean | null;
  tags: string[];
  purchase_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AssetStats {
  total: number;
  new_this_month: number;
  in_use: number;
  not_in_use: number;
}

export interface AssetFilterState {
  search: string;
  categoryFilter: string;
  sortBy: "newest" | "oldest" | "name_asc" | "name_desc";
}

export interface AssetFormState {
  name: string;
  description: string;
  location: string;
  image_url: string;
  category_id: string;
  quantity: string;
  unit_label: string;
  is_used: string;
  purchase_date: string;
  tags: string;
  notes: string;
}

// ─── Asset Logs ──────────────────────────────────────────────────────────────

export type AssetLogType =
  | "status_change"
  | "part_replacement"
  | "maintenance"
  | "general"
  | "image_attachment"
  | "quantity_change"
  | "asset_update";

/**
 * Maps the `is_used` boolean-or-null to a short status string stored in logs.
 * "used" | "unused" | "unset"
 */
export type AssetUsageStatus = "used" | "unused" | "unset";

export interface AssetLog {
  id: string;
  asset_id: string;
  tenant_id: string;
  log_type: AssetLogType;

  // status_change
  old_status: AssetUsageStatus | null;
  new_status: AssetUsageStatus | null;

  // part_replacement
  part_name: string | null;
  replaced_with: string | null;

  // image_attachment
  image_url: string | null;

  // quantity_change
  old_quantity: number | null;
  new_quantity: number | null;

  // shared narrative (used by maintenance, general, image_attachment, quantity_change, etc.)
  notes: string | null;

  // audit
  logged_by: string | null;
  logged_by_full_name: string | null;
  logged_at: string;
}

export interface AssetLogFormState {
  log_type: AssetLogType;
  new_status: AssetUsageStatus;
  part_name: string;
  replaced_with: string;
  notes: string;

  // image_attachment
  imageFile: File | null;
  imagePreview: string;

  // quantity_change
  new_quantity: string;
}
