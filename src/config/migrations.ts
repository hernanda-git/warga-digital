export interface MigrationStep {
  id: string;
  sql: string;
}

export interface MigrationPhase {
  id: number;
  label: string;
  description: string;
  steps: MigrationStep[];
}

const PGCYPTO = `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
const PG_CRON = `CREATE EXTENSION IF NOT EXISTS pg_cron;`;

const CLEANUP_FN = `
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$;
`;

const SESSION_CRON = `
SELECT cron.schedule(
  'clean-expired-sessions',
  '0 3 * * *',
  $$ SELECT clean_expired_sessions(); $$
);
`;

const KAS_RT_SUMMARY_FN = `
CREATE OR REPLACE FUNCTION get_kas_rt_summary(
  p_tenant_id UUID,
  p_community_id UUID,
  p_this_month_start DATE,
  p_prev_month_end DATE,
  p_prev_month_start DATE
)
RETURNS TABLE (
  balance NUMERIC,
  balance_end_prev_month NUMERIC,
  this_month_income NUMERIC,
  this_month_expense NUMERIC,
  prev_month_net NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::NUMERIC AS balance,
    COALESCE(SUM(CASE WHEN date <= p_prev_month_end THEN CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0)::NUMERIC AS balance_end_prev_month,
    COALESCE(SUM(CASE WHEN date >= p_this_month_start AND type = 'income' THEN amount ELSE 0 END), 0)::NUMERIC AS this_month_income,
    COALESCE(SUM(CASE WHEN date >= p_this_month_start AND type = 'expense' THEN amount ELSE 0 END), 0)::NUMERIC AS this_month_expense,
    COALESCE(SUM(CASE WHEN date >= p_prev_month_start AND date <= p_prev_month_end THEN CASE WHEN type = 'income' THEN amount ELSE -amount END ELSE 0 END), 0)::NUMERIC AS prev_month_net
  FROM kas_rt_transactions
  WHERE tenant_id = p_tenant_id AND community_id = p_community_id AND deleted_at IS NULL;
END;
$$;
`;

const DELETE_USER_FN = `
CREATE OR REPLACE FUNCTION delete_user_with_cleanup(target_user_id UUID)
RETURNS TABLE(
  houses_transferred INT,
  houses_vacated INT,
  authority_roles_revoked INT,
  marketplace_items_archived INT,
  join_requests_rejected INT,
  tenant_roles_revoked INT,
  prereg_owners_skipped INT,
  user_deleted BOOLEAN
) AS $$
DECLARE
  v_houses_transferred INT := 0;
  v_houses_vacated INT := 0;
  v_authority_revoked INT := 0;
  v_marketplace_archived INT := 0;
  v_join_requests_rejected INT := 0;
  v_tenant_roles_revoked INT := 0;
  v_prereg_skipped INT := 0;
  v_user_deleted BOOLEAN := false;
  v_house_record RECORD;
  v_family_member RECORD;
BEGIN
  FOR v_house_record IN
    SELECT uh.id, uh.house_id, uh.tenant_id
    FROM user_houses uh
    WHERE uh.user_id = target_user_id
      AND uh.relationship = 'OWNER'
      AND uh.is_primary = true
      AND uh.status = 'ACTIVE'
  LOOP
    SELECT uh2.id, uh2.user_id INTO v_family_member
    FROM user_houses uh2
    WHERE uh2.house_id = v_house_record.house_id
      AND uh2.relationship = 'FAMILY'
      AND uh2.status = 'ACTIVE'
    ORDER BY uh2.created_at ASC
    LIMIT 1;
    IF FOUND THEN
      UPDATE user_houses SET relationship = 'OWNER', is_primary = true WHERE id = v_family_member.id;
      v_houses_transferred := v_houses_transferred + 1;
    ELSE
      v_houses_vacated := v_houses_vacated + 1;
    END IF;
    UPDATE user_houses SET status = 'INACTIVE', is_primary = false, move_out_date = CURRENT_DATE WHERE id = v_house_record.id;
  END LOOP;
  UPDATE authority_assignments aa SET status = 'REVOKED', end_date = CURRENT_DATE FROM tenant_users tu WHERE aa.tenant_user_id = tu.id AND tu.user_id = target_user_id AND aa.status = 'ACTIVE';
  GET DIAGNOSTICS v_authority_revoked = ROW_COUNT;
  UPDATE marketplace_items SET status = 'ARCHIVED', updated_at = NOW() WHERE owner_user_id = target_user_id AND status = 'ACTIVE';
  GET DIAGNOSTICS v_marketplace_archived = ROW_COUNT;
  UPDATE house_join_requests SET status = 'REJECTED', responded_at = NOW(), responded_by = target_user_id WHERE requester_user_id = target_user_id AND status = 'PENDING';
  GET DIAGNOSTICS v_join_requests_rejected = ROW_COUNT;
  UPDATE tenant_user_roles tur SET revoked_at = NOW() FROM tenant_users tu WHERE tur.tenant_user_id = tu.id AND tu.user_id = target_user_id AND tur.revoked_at IS NULL;
  GET DIAGNOSTICS v_tenant_roles_revoked = ROW_COUNT;
  UPDATE system_preregistered_house_owners SET status = 'SKIPPED', updated_at = NOW() WHERE claimed_by_user_id = target_user_id AND status = 'CLAIMED';
  GET DIAGNOSTICS v_prereg_skipped = ROW_COUNT;
  UPDATE notifications SET created_by = NULL, updated_by = NULL WHERE created_by = target_user_id OR updated_by = target_user_id;
  UPDATE houses SET created_by = NULL, updated_by = NULL WHERE created_by = target_user_id OR updated_by = target_user_id;
  UPDATE tenants SET created_by = NULL, updated_by = NULL WHERE created_by = target_user_id OR updated_by = target_user_id;
  UPDATE communities SET created_by = NULL, updated_by = NULL WHERE created_by = target_user_id OR updated_by = target_user_id;
  UPDATE roles SET created_by = NULL, updated_by = NULL WHERE created_by = target_user_id OR updated_by = target_user_id;
  DELETE FROM users WHERE id = target_user_id;
  IF FOUND THEN v_user_deleted := true; END IF;
  RETURN QUERY SELECT v_houses_transferred, v_houses_vacated, v_authority_revoked, v_marketplace_archived, v_join_requests_rejected, v_tenant_roles_revoked, v_prereg_skipped, v_user_deleted;
END;
$$ LANGUAGE plpgsql;
`;

const ENUMS_SQL = `
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE tenant_type AS ENUM ('PERUMAHAN', 'DESA', 'KOPERASI');
CREATE TYPE community_level AS ENUM ('RT', 'RW', 'OTHER');
CREATE TYPE house_status AS ENUM ('PRIBADI', 'KONTRAKAN', 'KOSONG');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');
CREATE TYPE tenant_user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE relationship_type AS ENUM ('OWNER', 'FAMILY', 'TENANT', 'CARETAKER');
CREATE TYPE user_house_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE role_scope AS ENUM ('SYSTEM', 'TENANT', 'HOUSE');
CREATE TYPE authority_type AS ENUM ('RT', 'RW', 'DKM', 'KOPERASI', 'SATPAM');
CREATE TYPE authority_status AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE entity_type AS ENUM ('USER', 'HOUSE', 'USER_HOUSE');
CREATE TYPE verification_status AS ENUM ('VERIFIED', 'REVOKED');
CREATE TYPE kas_rt_tx_type AS ENUM ('PEMASUKAN', 'PENGELUARAN');
CREATE TYPE house_join_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE notification_type AS ENUM ('SYSTEM', 'KAS_RT', 'RUMAH', 'ORGANISASI', 'MARKETPLACE');
CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE marketplace_domain_code AS ENUM ('UMKM', 'JASA');
CREATE TYPE marketplace_item_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');
CREATE TYPE marketplace_tx_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE marketplace_payment_status AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE marketplace_tx_event_type AS ENUM ('CREATED', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED');
`.trim();

const CORE_TABLES_SQL = `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  wa_number TEXT,
  wa_verified_at TIMESTAMPTZ,
  email VARCHAR(150) UNIQUE,
  date_of_birth DATE,
  status user_status NOT NULL DEFAULT 'INACTIVE',
  pin_hash TEXT,
  username VARCHAR(50) UNIQUE,
  avatar_path TEXT,
  theme_id VARCHAR(20) NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  type tenant_type NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status tenant_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150),
  level community_level NOT NULL DEFAULT 'OTHER',
  parent_community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id),
  UNIQUE (tenant_id, code)
);

CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  blok_rumah VARCHAR(20),
  address VARCHAR(255),
  total_residents INT DEFAULT 0,
  status house_status NOT NULL DEFAULT 'PRIBADI',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status tenant_user_status NOT NULL DEFAULT 'ACTIVE',
  reputation_points INT DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE user_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  relationship relationship_type NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  move_in_date DATE,
  move_out_date DATE,
  status user_house_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  scope role_scope NOT NULL DEFAULT 'TENANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE tenant_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE authority_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  authority_type authority_type NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  status authority_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  verified_by_authority_id UUID REFERENCES authority_assignments(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  status verification_status NOT NULL DEFAULT 'VERIFIED'
);
`.trim();

const FEATURE_TABLES_SQL = `
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_number_hash VARCHAR(64) NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code marketplace_domain_code NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon VARCHAR(10),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES marketplace_domains(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  icon VARCHAR(10),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (domain_id, slug)
);

CREATE TABLE marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_display_name VARCHAR(150) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  summary VARCHAR(300),
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent SMALLINT NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount NUMERIC(12,2) GENERATED ALWAYS AS (base_price * discount_percent / 100) STORED,
  final_price NUMERIC(12,2) GENERATED ALWAYS AS (base_price - (base_price * discount_percent / 100)) STORED,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'IDR',
  unit_label VARCHAR(30) NOT NULL DEFAULT 'pcs',
  stock_qty INT,
  is_service BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count INT NOT NULL DEFAULT 0,
  status marketplace_item_status NOT NULL DEFAULT 'DRAFT',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  wa_number TEXT,
  location_note VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE marketplace_item_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(200),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  tag VARCHAR(60) NOT NULL,
  UNIQUE (item_id, tag)
);

CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
  buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  item_price_snapshot NUMERIC(12,2) NOT NULL,
  discount_snapshot_pct SMALLINT NOT NULL DEFAULT 0,
  discount_snapshot_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_amount NUMERIC(12,2) NOT NULL,
  platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  status marketplace_tx_status NOT NULL DEFAULT 'PENDING',
  payment_status marketplace_payment_status NOT NULL DEFAULT 'UNPAID',
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE marketplace_transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  event_type marketplace_tx_event_type NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kas_rt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type kas_rt_tx_type NOT NULL,
  date DATE NOT NULL,
  reference VARCHAR(50),
  details TEXT,
  category VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE kas_rt_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  applies_to VARCHAR(10) NOT NULL DEFAULT 'both' CHECK (applies_to IN ('income', 'expense', 'both')),
  title_template VARCHAR(255) NOT NULL DEFAULT '',
  desc_template TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, community_id, name)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL DEFAULT 'SYSTEM',
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  action_url VARCHAR(255),
  entity_table VARCHAR(60),
  entity_id UUID,
  dedupe_key VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  excerpt TEXT,
  body TEXT,
  author_label VARCHAR(150) NOT NULL DEFAULT 'Pengurus RT',
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE organisation_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_role_id UUID NOT NULL REFERENCES organisation_roles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  block_name TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL,
  profile_picture_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon VARCHAR(20) NOT NULL DEFAULT '🏅',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE house_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status house_join_request_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  UNIQUE (house_id, requester_user_id)
);

CREATE TABLE system_preregistered_house_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  pre_registered_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_row_no INT,
  source_full_name TEXT,
  source_status_rumah TEXT,
  source_keterangan TEXT,
  import_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRE_REGISTERED' CHECK (status IN ('PRE_REGISTERED', 'CLAIMED', 'SKIPPED')),
  claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
`.trim();

const INCREMENTAL_TABLES_SQL = `
CREATE TABLE kas_rt_transaction_category_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES kas_rt_transaction_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate_per_warga NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_warga >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (category_id, name)
);

CREATE TABLE kas_rt_transaction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES kas_rt_transactions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate_per_warga NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_warga >= 0),
  jumlah_warga INT NOT NULL DEFAULT 0 CHECK (jumlah_warga >= 0),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organisation_member_customs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_member_id UUID NOT NULL UNIQUE REFERENCES organisation_members(id) ON DELETE CASCADE,
  custom_full_name TEXT NOT NULL,
  custom_block_name TEXT NOT NULL DEFAULT '',
  custom_whatsapp_number TEXT NOT NULL,
  custom_profile_picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jasa_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_display_name VARCHAR(150) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT,
  summary VARCHAR(300),
  estimated_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'IDR',
  hari_operasional JSONB NOT NULL DEFAULT '{}',
  jam_operasional_mulai VARCHAR(5) NOT NULL,
  jam_operasional_selesai VARCHAR(5) NOT NULL,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'TERSEDIA' CHECK (availability_status IN ('TERSEDIA', 'TIDAK_TERSEDIA', 'FULL_BOOKED')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED')),
  wa_number VARCHAR(20),
  location_note TEXT,
  rating_avg NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE jasa_sub_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jasa_service_id UUID NOT NULL REFERENCES jasa_services(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE jasa_service_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES jasa_services(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(200),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jualan_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_category_slug UNIQUE (tenant_id, slug)
);

CREATE TABLE jualan_goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES jualan_categories(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_display_name text NOT NULL,
  owner_blok_rumah text,
  name text NOT NULL,
  slug text NOT NULL,
  summary text,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric GENERATED ALWAYS AS (base_price * discount_percent / 100) STORED,
  final_price numeric GENERATED ALWAYS AS (base_price - (base_price * discount_percent / 100)) STORED,
  currency_code text NOT NULL DEFAULT 'IDR',
  unit_label text NOT NULL DEFAULT 'pcs',
  stock_qty integer NOT NULL DEFAULT 0,
  sold_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  wa_number text,
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  CONSTRAINT unique_goods_slug UNIQUE (tenant_id, slug),
  CONSTRAINT check_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100),
  CONSTRAINT check_prices CHECK (base_price >= 0 AND final_price >= 0),
  CONSTRAINT check_stock CHECK (stock_qty >= 0),
  CONSTRAINT check_sold_count CHECK (sold_count >= 0)
);

CREATE TABLE jualan_item_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES jualan_goods(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image_url TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE article_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INT,
  height INT,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token_hash)
);
`.trim();

const INDEXES_SQL = `
CREATE UNIQUE INDEX idx_houses_tenant_community_blok ON houses (tenant_id, community_id, blok_rumah) WHERE blok_rumah IS NOT NULL;
CREATE UNIQUE INDEX user_houses_one_primary_per_tenant_user ON user_houses (tenant_id, user_id) WHERE is_primary = true AND status = 'ACTIVE';
CREATE UNIQUE INDEX tenant_user_roles_active_unique ON tenant_user_roles (tenant_user_id, role_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX marketplace_item_media_one_primary ON marketplace_item_media (item_id) WHERE is_primary = true;
CREATE UNIQUE INDEX notifications_recipient_dedupe_unique ON notifications (recipient_user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE UNIQUE INDEX idx_users_wa_number_unique ON users(wa_number) WHERE wa_number IS NOT NULL;
CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX uq_system_prereg_owner_import_key ON system_preregistered_house_owners (import_key);
CREATE UNIQUE INDEX uq_system_prereg_owner_house_active ON system_preregistered_house_owners (tenant_id, house_id) WHERE status = 'PRE_REGISTERED';
CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE UNIQUE INDEX jasa_service_media_primary ON jasa_service_media (service_id) WHERE is_primary = true;

CREATE INDEX idx_tenants_created_by ON tenants(created_by);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_communities_tenant_id ON communities(tenant_id);
CREATE INDEX idx_communities_parent ON communities(parent_community_id);
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_houses_tenant_id ON houses(tenant_id);
CREATE INDEX idx_houses_community_id ON houses(community_id);
CREATE INDEX idx_houses_created_by ON houses(created_by);
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_status ON tenant_users(status);
CREATE INDEX idx_user_houses_tenant_id ON user_houses(tenant_id);
CREATE INDEX idx_user_houses_user_id ON user_houses(user_id);
CREATE INDEX idx_user_houses_house_id ON user_houses(house_id);
CREATE INDEX idx_user_houses_status ON user_houses(status);
CREATE INDEX idx_tenant_user_roles_tenant_user_id ON tenant_user_roles(tenant_user_id);
CREATE INDEX idx_tenant_user_roles_role_id ON tenant_user_roles(role_id);
CREATE INDEX idx_authority_assignments_tenant_id ON authority_assignments(tenant_id);
CREATE INDEX idx_authority_assignments_tenant_user_id ON authority_assignments(tenant_user_id);
CREATE INDEX idx_authority_assignments_community_id ON authority_assignments(community_id);
CREATE INDEX idx_authority_assignments_status ON authority_assignments(status);
CREATE INDEX idx_verifications_tenant_id ON verifications(tenant_id);
CREATE INDEX idx_verifications_entity ON verifications(entity_type, entity_id);
CREATE INDEX idx_otp_codes_wa_hash_expires ON otp_codes(wa_number_hash, expires_at);
CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_created_at ON otp_codes(created_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_active ON sessions(last_active_at);
CREATE INDEX idx_mkt_categories_domain ON marketplace_categories (domain_id, is_active, sort_order);
CREATE INDEX idx_mkt_items_category ON marketplace_items (category_id, status, published_at DESC);
CREATE INDEX idx_mkt_items_owner ON marketplace_items (owner_user_id, status);
CREATE INDEX idx_mkt_items_featured ON marketplace_items (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_mkt_items_tenant ON marketplace_items (tenant_id, status);
CREATE INDEX idx_mkt_item_media_item ON marketplace_item_media (item_id, sort_order);
CREATE INDEX idx_mkt_item_tags_item ON marketplace_item_tags (item_id);
CREATE INDEX idx_mkt_tx_buyer ON marketplace_transactions (buyer_user_id, status);
CREATE INDEX idx_mkt_tx_seller ON marketplace_transactions (seller_user_id, status);
CREATE INDEX idx_mkt_tx_item ON marketplace_transactions (item_id);
CREATE INDEX idx_mkt_tx_events_tx ON marketplace_transaction_events (transaction_id, created_at);
CREATE INDEX idx_kas_rt_tx_category ON kas_rt_transactions (category);
CREATE INDEX idx_kas_rt_tx_categories_tenant_community ON kas_rt_transaction_categories (tenant_id, community_id, applies_to, sort_order);
CREATE INDEX idx_kas_rt_transactions_not_deleted ON kas_rt_transactions (tenant_id, community_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_kas_rt_transactions_deleted ON kas_rt_transactions (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread_recipient ON notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type_recipient_created ON notifications (type, recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_actor_created ON notifications (actor_user_id, created_at DESC);
CREATE INDEX idx_notifications_tenant_type_created ON notifications (tenant_id, type, created_at DESC);
CREATE INDEX idx_announcements_feed ON announcements (tenant_id, is_active, published_at DESC) WHERE is_active = true AND published_at IS NOT NULL;
CREATE INDEX idx_announcements_pinned ON announcements (tenant_id, is_pinned, published_at DESC) WHERE is_active = true;
CREATE INDEX idx_announcements_community ON announcements (community_id, published_at DESC) WHERE community_id IS NOT NULL AND is_active = true;
CREATE INDEX idx_announcements_author_user ON announcements (author_user_id) WHERE author_user_id IS NOT NULL;
CREATE INDEX idx_organisation_roles_tenant_id ON organisation_roles(tenant_id);
CREATE INDEX idx_organisation_roles_sort_order ON organisation_roles(tenant_id, sort_order);
CREATE INDEX idx_organisation_members_role_id ON organisation_members(organisation_role_id);
CREATE INDEX idx_organisation_members_sort_order ON organisation_members(organisation_role_id, sort_order);
CREATE INDEX idx_organisation_members_user_id ON organisation_members(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_badges_sort_order ON badges(sort_order);
CREATE INDEX idx_house_join_requests_house_id ON house_join_requests(house_id);
CREATE INDEX idx_house_join_requests_requester_user_id ON house_join_requests(requester_user_id);
CREATE INDEX idx_house_join_requests_status ON house_join_requests(status);
CREATE INDEX idx_kas_rt_category_details_category ON kas_rt_transaction_category_details (category_id, sort_order);
CREATE INDEX idx_kas_rt_category_details_active ON kas_rt_transaction_category_details (category_id) WHERE is_active = TRUE;
CREATE INDEX idx_kas_rt_transaction_details_transaction ON kas_rt_transaction_details (transaction_id, sort_order);
CREATE INDEX idx_jasa_services_category ON jasa_services (category_id, status);
CREATE INDEX idx_jasa_services_owner ON jasa_services (owner_user_id, status);
CREATE INDEX idx_jasa_services_tenant ON jasa_services (tenant_id, status);
CREATE INDEX idx_jasa_services_slug ON jasa_services (slug);
CREATE INDEX idx_jasa_services_featured ON jasa_services (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_jasa_services_published ON jasa_services (status, published_at DESC);
CREATE INDEX idx_jasa_sub_services_parent ON jasa_sub_services (jasa_service_id);
CREATE INDEX idx_jasa_service_media_service ON jasa_service_media (service_id, sort_order);
CREATE INDEX idx_jualan_categories_tenant ON jualan_categories(tenant_id);
CREATE INDEX idx_jualan_categories_active ON jualan_categories(is_active);
CREATE INDEX idx_jualan_goods_tenant ON jualan_goods(tenant_id);
CREATE INDEX idx_jualan_goods_category ON jualan_goods(category_id);
CREATE INDEX idx_jualan_goods_owner ON jualan_goods(owner_user_id);
CREATE INDEX idx_jualan_goods_active ON jualan_goods(is_active);
CREATE INDEX idx_jualan_goods_featured ON jualan_goods(is_featured);
CREATE INDEX idx_jualan_goods_published ON jualan_goods(published_at);
CREATE INDEX idx_jualan_goods_price ON jualan_goods(final_price);
CREATE INDEX idx_jualan_goods_sold ON jualan_goods(sold_count);
CREATE INDEX idx_jualan_item_media_item ON jualan_item_media(item_id);
CREATE INDEX idx_jualan_item_media_primary ON jualan_item_media(is_primary);
CREATE INDEX idx_organisation_member_customs_member_id ON organisation_member_customs(organisation_member_id);
CREATE INDEX idx_article_images_article_id ON article_images(article_id);
CREATE INDEX idx_article_images_sort_order ON article_images(article_id, sort_order);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_author_id ON articles(author_id);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_deleted_at ON articles(deleted_at);
CREATE INDEX idx_articles_created_by ON articles(created_by);
CREATE INDEX idx_articles_updated_by ON articles(updated_by);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;
`.trim();

const RLS_SQL = `
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_preregistered_house_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transaction_category_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE jasa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jasa_sub_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jasa_service_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE jualan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jualan_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE jualan_item_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_member_customs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users: no anon access" ON users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenants: no anon access" ON tenants FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Communities: no anon access" ON communities FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Houses: no anon access" ON houses FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenant users: no anon access" ON tenant_users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "User houses: no anon access" ON user_houses FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Roles: no anon access" ON roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenant user roles: no anon access" ON tenant_user_roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Authority assignments: no anon access" ON authority_assignments FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Verifications: no anon access" ON verifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "OTP codes: no anon access" ON otp_codes FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Sessions: no anon access" ON sessions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Kas RT transactions: no anon access" ON kas_rt_transactions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Notifications: no anon access" ON notifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Announcements: no anon access" ON announcements FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Organisation roles: no anon access" ON organisation_roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Organisation members: no anon access" ON organisation_members FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Badges: no anon access" ON badges FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "User badges: no anon access" ON user_badges FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "House join requests: no anon access" ON house_join_requests FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "System prereg owners: no anon access" ON system_preregistered_house_owners FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Anyone can read active domains" ON marketplace_domains FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active categories" ON marketplace_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active items" ON marketplace_items FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Anyone can read item media" ON marketplace_item_media FOR SELECT USING (true);
CREATE POLICY "Anyone can read item tags" ON marketplace_item_tags FOR SELECT USING (true);
CREATE POLICY "Owner can insert items" ON marketplace_items FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own items" ON marketplace_items FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Buyer can read own transactions" ON marketplace_transactions FOR SELECT USING (buyer_user_id = auth.uid() OR seller_user_id = auth.uid());
CREATE POLICY "Buyer can create transactions" ON marketplace_transactions FOR INSERT WITH CHECK (buyer_user_id = auth.uid());
CREATE POLICY "Participants can read transaction events" ON marketplace_transaction_events FOR SELECT USING (transaction_id IN (SELECT id FROM marketplace_transactions WHERE buyer_user_id = auth.uid() OR seller_user_id = auth.uid()));
CREATE POLICY "Anyone can read kas RT categories" ON kas_rt_transaction_categories FOR SELECT USING (true);
CREATE POLICY "Anon cannot write kas RT categories" ON kas_rt_transaction_categories FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Anyone can read active jasa services" ON jasa_services FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Owner can insert jasa services" ON jasa_services FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own jasa services" ON jasa_services FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own jasa services" ON jasa_services FOR DELETE USING (owner_user_id = auth.uid());
CREATE POLICY "Anyone can read sub services of active jasa" ON jasa_sub_services FOR SELECT USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.status = 'ACTIVE'));
CREATE POLICY "Owner can insert sub services" ON jasa_sub_services FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()));
CREATE POLICY "Owner can update own sub services" ON jasa_sub_services FOR UPDATE USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()));
CREATE POLICY "Owner can delete own sub services" ON jasa_sub_services FOR DELETE USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()));
CREATE POLICY "Anyone can read media of active jasa services" ON jasa_service_media FOR SELECT USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.status = 'ACTIVE'));
CREATE POLICY "Owner can insert media for own services" ON jasa_service_media FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()));
CREATE POLICY "Owner can update media for own services" ON jasa_service_media FOR UPDATE USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()));
CREATE POLICY "Owner can delete media for own services" ON jasa_service_media FOR DELETE USING (EXISTS (SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()));
`.trim();

const SEEDS_SQL = `
INSERT INTO tenants (id, name, description, type, status) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sawangan Regensi', 'Ekosistem digital Sawangan Regensi RT 03', 'PERUMAHAN', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id) VALUES
  ('b0000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'RW14', 'RW 14', 'RW', NULL),
  ('b0000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'RT03', 'RT 03 Sawangan Regensi', 'RT', 'b0000000-0000-7000-8000-000000000001'::uuid)
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, name, description, scope) VALUES
  (1, 'WARGA', 'Warga biasa', 'TENANT'),
  (2, 'SELLER', 'Penjual', 'TENANT'),
  (3, 'BUYER', 'Pembeli', 'TENANT'),
  (4, 'RT_ADMIN', 'Admin RT', 'TENANT'),
  (5, 'RW_ADMIN', 'Admin RW', 'TENANT'),
  (6, 'KOPERASI_ADMIN', 'Admin Koperasi', 'TENANT'),
  (7, 'PLATFORM_ARBITER', 'Arbiter platform', 'SYSTEM'),
  (8, 'RT_BENDAHARA', 'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_domains (id, code, name, description, icon, sort_order) VALUES
  ('d0000000-0000-7000-8000-000000000001'::uuid, 'UMKM', 'UMKM', 'Produk UMKM warga — sembako, makanan, kerajinan', '🛒', 1),
  ('d0000000-0000-7000-8000-000000000002'::uuid, 'JASA', 'Jasa Warga', 'Layanan jasa antar-warga', '🔧', 2)
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order) VALUES
  ('c1000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Sembako', 'sembako', 'Sembako & kebutuhan sehari-hari', '🛍️', 1),
  ('c1000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Makanan & Minuman', 'makanan-minuman', 'Makanan, cemilan, minuman', '🍱', 2),
  ('c1000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Kerajinan Tangan', 'kerajinan-tangan', 'Hasil kerajinan warga', '🎨', 3),
  ('c1000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Sayur & Buah', 'sayur-buah', 'Sayur & buah dari kebun warga', '🥬', 4),
  ('c2000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Kelistrikan', 'kelistrikan', 'Perbaikan & instalasi listrik', '⚡', 1),
  ('c2000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Jahit', 'jahit', 'Jahit baju, kaos, dll', '🧵', 2),
  ('c2000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Antar-Jemput', 'antar-jemput', 'Antar jemput dalam kompleks', '🚗', 3),
  ('c2000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Bersih-bersih', 'bersih-bersih', 'Kebersihan rumah & kantor', '🧹', 4)
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_items (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug, summary, base_price, discount_percent, currency_code, unit_label, stock_qty, is_service, status, published_at) VALUES
  ('e1000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Toko Pak Edi', 'Beras Premium 5kg', 'beras-premium-5kg', 'Beras kualitas premium dari Cianjur', 75000, 0, 'IDR', 'karung', 50, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Warung Bu Siti', 'Minyak Goreng 2L', 'minyak-goreng-2l', 'Minyak goreng kemasan 2 liter', 36000, 5, 'IDR', 'botol', 30, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000003'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Dapur Bu Ani', 'Nasi Uduk Komplit', 'nasi-uduk-komplit', 'Nasi uduk + lauk lengkap, pagi hari', 15000, 0, 'IDR', 'porsi', NULL, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000004'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Kue Mba Rina', 'Kue Lapis Legit', 'kue-lapis-legit', 'Kue lapis legit homemade, loyang kecil', 85000, 10, 'IDR', 'loyang', 10, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000005'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Craft by Dewi', 'Tas Rajut Handmade', 'tas-rajut-handmade', 'Tas rajut katun warna-warni', 120000, 15, 'IDR', 'pcs', 5, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000006'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Kebun Pak Agus', 'Paket Sayur Segar', 'paket-sayur-segar', 'Bayam, kangkung, tomat, cabai — segar dari kebun', 25000, 0, 'IDR', 'paket', 20, false, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Pak Joko Listrik', 'Perbaikan Instalasi Listrik', 'perbaikan-instalasi-listrik', 'Pasang baru, tambah daya, perbaikan arus pendek', 150000, 0, 'IDR', 'kunjungan', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Bu Ratna Taylor', 'Jahit & Permak Pakaian', 'jahit-permak-pakaian', 'Potong, jahit baru, permak celana/baju', 50000, 0, 'IDR', 'item', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000003'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Bang Dedi Ojek', 'Ojek Dalam Kompleks', 'ojek-dalam-kompleks', 'Antar jemput dalam area Sawangan Regensi', 10000, 0, 'IDR', 'trip', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000004'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Tim Bersih Blok A', 'Bersih Rumah & Kantor', 'bersih-rumah-kantor', 'Deep clean rumah, pembersihan taman, garasi', 200000, 10, 'IDR', 'sesi', NULL, true, 'ACTIVE', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO kas_rt_transaction_categories (tenant_id, community_id, name, applies_to, title_template, desc_template, sort_order) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'IPL', 'income', 'IPL Bulan {bulan}', 'Pembayaran IPL untuk blok {blok} periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Sumbangan', 'income', 'Sumbangan Bulan {bulan}', 'Sumbangan sukarela dari blok {blok} periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Denda', 'income', 'Denda dari Blok {blok}', 'Pembayaran denda dari blok {blok}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pendapatan Lain', 'income', 'Pendapatan Lain-lain Bulan {bulan}', 'Pendapatan lain-lain periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Kebersihan', 'expense', 'Biaya Kebersihan {bulan}', 'Pembayaran petugas kebersihan periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Keamanan', 'expense', 'Biaya Keamanan/Satpam {bulan}', 'Honorarium satpam/keamanan periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Operasional', 'expense', 'Biaya Operasional {bulan}', 'Pengeluaran operasional RT periode {bulan}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Perbaikan & Pemeliharaan', 'expense', 'Biaya Perbaikan {bulan}', 'Biaya perbaikan/pemeliharaan lingkungan RT periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pengeluaran Lain', 'expense', 'Pengeluaran Lain-lain {bulan}', 'Pengeluaran lain-lain periode {bulan}', 50)
ON CONFLICT DO NOTHING;
`.trim();

const TRIGGER_FUNCTIONS_SQL = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_created_by_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(title), '[^a-zA-Z0-9\\s-]', '', 'g'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_article_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_single_primary_media()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE jualan_item_media SET is_primary = false
    WHERE item_id = NEW.item_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_jualan_goods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_articles_created_by
  BEFORE INSERT ON articles
  FOR EACH ROW EXECUTE FUNCTION set_created_by_column();

CREATE TRIGGER set_article_slug_trigger
  BEFORE INSERT ON articles
  FOR EACH ROW EXECUTE FUNCTION set_article_slug();

CREATE TRIGGER update_article_images_updated_at
  BEFORE UPDATE ON article_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_jualan_item_media_single_primary
  BEFORE INSERT OR UPDATE ON jualan_item_media
  FOR EACH ROW EXECUTE FUNCTION enforce_single_primary_media();

CREATE TRIGGER trg_jualan_goods_updated_at
  BEFORE UPDATE ON jualan_goods
  FOR EACH ROW EXECUTE FUNCTION update_jualan_goods_updated_at();
`.trim();

const VERIFICATION_SQL = `
SELECT 'users' as tbl, COUNT(*)::text as cnt FROM users
UNION ALL SELECT 'tenants', COUNT(*)::text FROM tenants
UNION ALL SELECT 'communities', COUNT(*)::text FROM communities
UNION ALL SELECT 'houses', COUNT(*)::text FROM houses
UNION ALL SELECT 'tenant_users', COUNT(*)::text FROM tenant_users
UNION ALL SELECT 'user_houses', COUNT(*)::text FROM user_houses
UNION ALL SELECT 'roles', COUNT(*)::text FROM roles
UNION ALL SELECT 'tenant_user_roles', COUNT(*)::text FROM tenant_user_roles
UNION ALL SELECT 'marketplace_domains', COUNT(*)::text FROM marketplace_domains
UNION ALL SELECT 'marketplace_categories', COUNT(*)::text FROM marketplace_categories
UNION ALL SELECT 'marketplace_items', COUNT(*)::text FROM marketplace_items
UNION ALL SELECT 'kas_rt_transaction_categories', COUNT(*)::text FROM kas_rt_transaction_categories
ORDER BY tbl;
`.trim();

export const MIGRATION_PHASES: MigrationPhase[] = [
  {
    id: 1,
    label: "Ekstensi",
    description: "Mengaktifkan ekstensi PostgreSQL (pgcrypto, pg_cron)",
    steps: [
      { id: "pgcrypto", sql: PGCYPTO },
      { id: "pg_cron", sql: PG_CRON },
    ],
  },
  {
    id: 2,
    label: "Enum Types",
    description: "Membuat tipe enum untuk kolom-kolom bertipe tetap",
    steps: [{ id: "enums", sql: ENUMS_SQL }],
  },
  {
    id: 3,
    label: "Tabel Inti",
    description: "Membuat tabel-tabel inti (users, tenants, communities, houses, dll)",
    steps: [{ id: "core-tables", sql: CORE_TABLES_SQL }],
  },
  {
    id: 4,
    label: "Tabel Fitur",
    description: "Membuat tabel untuk fitur (marketplace, kas RT, notifikasi, organisasi, badges, dll)",
    steps: [{ id: "feature-tables", sql: FEATURE_TABLES_SQL }],
  },
  {
    id: 5,
    label: "Tabel Tambahan",
    description: "Membuat tabel tambahan dari migrasi inkremental (jasa, jualan, artikel, audit log, dll)",
    steps: [{ id: "incremental-tables", sql: INCREMENTAL_TABLES_SQL }],
  },
  {
    id: 6,
    label: "Fungsi & Trigger",
    description: "Membuat fungsi PostgreSQL dan trigger",
    steps: [
      { id: "kas-rt-summary-fn", sql: KAS_RT_SUMMARY_FN },
      { id: "delete-user-fn", sql: DELETE_USER_FN },
      { id: "session-cleanup-fn", sql: CLEANUP_FN },
      { id: "session-cron", sql: SESSION_CRON },
      { id: "trigger-fns", sql: TRIGGER_FUNCTIONS_SQL },
    ],
  },
  {
    id: 7,
    label: "Index",
    description: "Membuat index untuk optimasi query",
    steps: [{ id: "indexes", sql: INDEXES_SQL }],
  },
  {
    id: 8,
    label: "RLS & Kebijakan Keamanan",
    description: "Mengaktifkan Row Level Security dan membuat kebijakan akses",
    steps: [{ id: "rls", sql: RLS_SQL }],
  },
  {
    id: 9,
    label: "Data Awal (Seed)",
    description: "Memasukkan data awal (tenant, roles, marketplace, kategori kas RT)",
    steps: [{ id: "seeds", sql: SEEDS_SQL }],
  },
  {
    id: 10,
    label: "Verifikasi",
    description: "Memverifikasi hasil migrasi dengan menghitung baris per tabel",
    steps: [{ id: "verify", sql: VERIFICATION_SQL }],
  },
];
