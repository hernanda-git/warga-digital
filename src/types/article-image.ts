export interface ArticleImage {
  id: string;
  article_id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleImageCreate {
  article_id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string | null;
  sort_order?: number;
}

export interface ArticleImageUpdate {
  object_key?: string;
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string | null;
  sort_order?: number;
}
