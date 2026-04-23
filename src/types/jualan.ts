export interface JualanCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface JualanGoods {
  id: string;
  tenant_id: string;
  category_id: string;
  owner_user_id: string;
  owner_display_name: string;
  owner_blok_rumah: string | null;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number;
  sold_count: number;
  is_active: boolean;
  wa_number: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface JualanItemMedia {
  id: string;
  item_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface JualanGoodsWithMedia {
  id: string;
  name: string;
  summary: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  wa_number: string | null;
  owner_display_name: string;
  owner_blok_rumah: string | null;
  owner_avatar_url: string | null;
  category_name: string;
  category_icon: string | null;
  primary_image_url: string | null;
  media_count: number;
}

export interface JualanGoodsDetail {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  wa_number: string | null;
  owner_display_name: string;
  owner_user_id: string;
  owner_blok_rumah: string | null;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  media: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
  }>;
  created_at: string;
  updated_at: string | null;
}
