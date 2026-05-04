export interface AdministrasiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  letter_types: AdministrasiLetterType[];
}

export interface AdministrasiLetterType {
  id: string;
  category_id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  fields: AdministrasiLetterField[];
  template_html: string | null;
}

export interface AdministrasiLetterField {
  id: string;
  letter_type_id: string;
  field_key: string;
  field_label: string;
  field_type: "text" | "textarea" | "number" | "date" | "select" | "email" | "tel";
  field_options: { label: string; value: string }[] | null;
  placeholder: string | null;
  is_required: boolean;
  auto_fill_source: string | null;
  sort_order: number;
}

export type LetterStatus = "draft" | "published" | "rejected";

export interface AdministrasiLetter {
  id: string;
  tenant_id: string;
  letter_type_id: string;
  user_id: string;
  letter_number: string | null;
  status: LetterStatus;
  data: Record<string, any>;
  notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  letter_type?: AdministrasiLetterType;
  user?: {
    id: string;
    full_name: string;
  };
  logs?: AdministrasiLetterLog[];
}

export interface AdministrasiLetterLog {
  id: string;
  letter_id: string;
  action: string;
  user_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AdministrasiNumberConfig {
  id: string;
  tenant_id: string;
  format_pattern: string;
  reset_frequency: "yearly" | "monthly" | "continuous";
  last_sequence: number;
  last_reset_year: number | null;
  last_reset_month: number | null;
  rt: string;
  rw: string;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  alamat_kantor: string | null;
  nama_ketua_rt: string | null;
}

export interface AdministrasiUserProfile {
  id: string;
  user_id: string;
  nik: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  agama: string | null;
  pekerjaan: string | null;
  kewarganegaraan: string | null;
  status_perkawinan: string | null;
}

export interface CreateLetterPayload {
  letter_type_slug: string;
  data: Record<string, any>;
}

export interface PublishLetterPayload {
  notes?: string;
}

export interface RejectLetterPayload {
  reason: string;
}

export interface LetterFormField {
  field_key: string;
  field_label: string;
  field_type: "text" | "textarea" | "number" | "date" | "select" | "email" | "tel";
  field_options: { label: string; value: string }[] | null;
  placeholder: string | null;
  is_required: boolean;
  sort_order: number;
  value?: any;
}
