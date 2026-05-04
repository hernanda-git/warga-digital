-- Administrasi Surat RT
-- Tables for digital administrative letter management

-- 1. Letter Categories (Kependudukan, Domisili, Ekonomi, etc.)
CREATE TABLE IF NOT EXISTS administrasi_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, slug)
);

-- 2. Letter Types (SKU, SP-KTP, SKTM, etc.)
CREATE TABLE IF NOT EXISTS administrasi_letter_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES administrasi_categories(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  template_html TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code),
  UNIQUE(tenant_id, slug)
);

-- 3. Letter Form Fields
CREATE TABLE IF NOT EXISTS administrasi_letter_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_type_id UUID NOT NULL REFERENCES administrasi_letter_types(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  field_options JSONB,
  placeholder VARCHAR(255),
  is_required BOOLEAN NOT NULL DEFAULT true,
  auto_fill_source VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(letter_type_id, field_key)
);

-- 4. Submitted Letters
CREATE TABLE IF NOT EXISTS administrasi_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  letter_type_id UUID NOT NULL REFERENCES administrasi_letter_types(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  letter_number VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  data JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 5. Letter Number Configuration
CREATE TABLE IF NOT EXISTS administrasi_number_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  format_pattern VARCHAR(255) NOT NULL DEFAULT '{sequence}/{letter_code}/RT.{rt}/RW.{rw}/{month_roman}/{year}',
  reset_frequency VARCHAR(20) NOT NULL DEFAULT 'yearly',
  last_sequence INT NOT NULL DEFAULT 0,
  last_reset_year INT,
  last_reset_month INT,
  rt VARCHAR(10) NOT NULL DEFAULT '01',
  rw VARCHAR(10) NOT NULL DEFAULT '02',
  kelurahan VARCHAR(255),
  kecamatan VARCHAR(255),
  kota VARCHAR(255),
  provinsi VARCHAR(255),
  kode_pos VARCHAR(10),
  alamat_kantor TEXT,
  nama_ketua_rt VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(tenant_id)
);

-- 6. Audit Log
CREATE TABLE IF NOT EXISTS administrasi_letter_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES administrasi_letters(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. User Profile Extension for Letter Data
CREATE TABLE IF NOT EXISTS administrasi_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nik VARCHAR(16),
  tempat_lahir VARCHAR(255),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20),
  agama VARCHAR(50),
  pekerjaan VARCHAR(255),
  kewarganegaraan VARCHAR(100) DEFAULT 'WNI',
  status_perkawinan VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE administrasi_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_letter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_letter_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_number_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_letter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrasi_user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Categories: readable by authenticated users
CREATE POLICY "categories_read_authenticated" ON administrasi_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Letter types: readable by authenticated users
CREATE POLICY "letter_types_read_authenticated" ON administrasi_letter_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Fields: readable by authenticated users
CREATE POLICY "fields_read_authenticated" ON administrasi_letter_fields
  FOR SELECT USING (auth.role() = 'authenticated');

-- Helper: check if auth user holds an admin role (RT_ADMIN=4, RW_ADMIN=5)
CREATE OR REPLACE FUNCTION public.is_administrasi_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users tu
    JOIN tenant_user_roles tur ON tur.tenant_user_id = tu.id
    WHERE tu.user_id = auth.uid()
      AND tu.status = 'ACTIVE'
      AND tur.role_id IN (4, 5)
      AND tur.revoked_at IS NULL
  );
$$;

-- Letters: users can read own, admins can read all
CREATE POLICY "letters_read_own" ON administrasi_letters
  FOR SELECT USING (user_id = auth.uid() OR public.is_administrasi_admin());

-- Letters: users can insert own
CREATE POLICY "letters_insert_own" ON administrasi_letters
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Letters: users can update own drafts, admins can update any
CREATE POLICY "letters_update" ON administrasi_letters
  FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'draft')
    OR public.is_administrasi_admin()
  );

-- Number config: readable by authenticated users
CREATE POLICY "config_read_authenticated" ON administrasi_number_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Number config: updatable by admins
CREATE POLICY "config_update_admin" ON administrasi_number_configs
  FOR UPDATE USING (public.is_administrasi_admin());

-- Logs: readable by letter owner or admin
CREATE POLICY "logs_read" ON administrasi_letter_logs
  FOR SELECT USING (
    letter_id IN (SELECT id FROM administrasi_letters WHERE user_id = auth.uid())
    OR public.is_administrasi_admin()
  );

-- User profiles: own read/write
CREATE POLICY "profiles_read_own" ON administrasi_user_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON administrasi_user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON administrasi_user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_adm_categories_tenant ON administrasi_categories(tenant_id);
CREATE INDEX idx_adm_letter_types_tenant ON administrasi_letter_types(tenant_id);
CREATE INDEX idx_adm_letter_types_category ON administrasi_letter_types(category_id);
CREATE INDEX idx_adm_letter_types_slug ON administrasi_letter_types(slug);
CREATE INDEX idx_adm_fields_type ON administrasi_letter_fields(letter_type_id);
CREATE INDEX idx_adm_letters_tenant ON administrasi_letters(tenant_id);
CREATE INDEX idx_adm_letters_user ON administrasi_letters(user_id);
CREATE INDEX idx_adm_letters_status ON administrasi_letters(status);
CREATE INDEX idx_adm_letters_number ON administrasi_letters(letter_number);
CREATE INDEX idx_adm_letters_created ON administrasi_letters(created_at DESC);
CREATE INDEX idx_adm_logs_letter ON administrasi_letter_logs(letter_id);
CREATE INDEX idx_adm_logs_created ON administrasi_letter_logs(created_at DESC);
CREATE INDEX idx_adm_profiles_user ON administrasi_user_profiles(user_id);

-- =============================================
-- SEED DATA
-- =============================================

DO $do$
DECLARE
  v_tenant_id UUID := 'a0000000-0000-7000-8000-000000000001';
  v_cat_id UUID;
  v_sku_id UUID;
  v_sktm_id UUID;
  v_sp_ktp_id UUID;
  v_sk_dom_id UUID;
  v_sk_kematian_id UUID;
BEGIN

-- === CATEGORIES ===

INSERT INTO administrasi_categories (tenant_id, name, slug, description, sort_order) VALUES
  (v_tenant_id, 'Kependudukan', 'kependudukan', 'Surat-surat terkait administrasi kependudukan', 1),
  (v_tenant_id, 'Domisili & Hunian', 'domisili-hunian', 'Surat-surat terkait domisili dan tempat tinggal', 2),
  (v_tenant_id, 'Ekonomi & Usaha', 'ekonomi-usaha', 'Surat-surat terkait usaha dan ekonomi warga', 3),
  (v_tenant_id, 'Sosial & Bantuan', 'sosial-bantuan', 'Surat-surat terkait bantuan sosial', 4),
  (v_tenant_id, 'Hukum & Administratif', 'hukum-administratif', 'Surat-surat terkait urusan hukum', 5),
  (v_tenant_id, 'Pernikahan & Keluarga', 'pernikahan-keluarga', 'Surat-surat terkait pernikahan dan keluarga', 6),
  (v_tenant_id, 'Kematian', 'kematian', 'Surat-surat terkait urusan kematian', 7),
  (v_tenant_id, 'Pendidikan', 'pendidikan', 'Surat-surat terkait urusan pendidikan', 8),
  (v_tenant_id, 'Keamanan & Lingkungan', 'keamanan-lingkungan', 'Surat-surat terkait keamanan dan lingkungan', 9),
  (v_tenant_id, 'Lain-lain', 'lain-lain', 'Surat-surat kasuistik lainnya', 10);

-- === LETTER TYPES ===

-- KEPENDUDUKAN (cat 1)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'kependudukan' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order, template_html) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SP-KTP', 'Surat Pengantar Pembuatan KTP', 'sp-ktp', 'Untuk membuat KTP baru atau perpanjangan', 1,
$$<div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6;color:#000;font-size:14pt;">
<div style="text-align:center;margin-bottom:10px;font-size:13pt;font-weight:bold;text-transform:uppercase;">pemerintahan {{kota}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kecamatan {{kecamatan}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kelurahan {{kelurahan}}</div>
<div style="text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">rukun tetangga {{rt}} / rukun warga {{rw}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:10pt;">{{alamat_kantor}}</div>
<hr style="border:1px solid #000;margin:10px 0 20px;">
<table style="width:100%;font-size:12pt;margin-bottom:20px;"><tr><td style="width:100px;">Nomor</td><td>: {{nomor_surat}}</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: <b>Pengantar Pembuatan KTP</b></td></tr></table>
<p style="text-align:justify;text-indent:40px;">Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama</td><td>: {{nama}}</td></tr><tr><td>NIK</td><td>: {{nik}}</td></tr><tr><td>Tempat, Tanggal Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr><tr><td>Jenis Kelamin</td><td>: {{jenis_kelamin}}</td></tr><tr><td>Agama</td><td>: {{agama}}</td></tr><tr><td>Pekerjaan</td><td>: {{pekerjaan}}</td></tr><tr><td>Alamat</td><td>: {{alamat}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Orang tersebut di atas adalah warga RT {{rt}} / RW {{rw}} yang bertempat tinggal di alamat tersebut. Surat pengantar ini dibuat untuk keperluan <b>pembuatan KTP ({{jenis_permohonan}})</b> {{alasan}}.</p>
<p style="text-align:justify;text-indent:40px;">Demikian surat pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div style="text-align:right;margin-top:40px;"><p style="margin-right:30px;">{{kota}}, {{tanggal_sekarang}}</p><br><br><br><p style="margin-right:30px;font-weight:bold;text-decoration:underline;">{{nama_ketua_rt}}</p><p style="margin-right:30px;">Ketua RT {{rt}} / RW {{rw}}</p></div></div>$$),
(v_tenant_id, (SELECT id FROM cat), 'SP-KK', 'Surat Pengantar Kartu Keluarga', 'sp-kk', 'Untuk pembuatan atau perubahan Kartu Keluarga', 2, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SP-PINDAH-DT', 'Surat Pengantar Pindah Datang', 'sp-pindah-datang', 'Untuk pindah datang ke wilayah RT', 3, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SP-PINDAH-KLR', 'Surat Pengantar Pindah Keluar', 'sp-pindah-keluar', 'Untuk pindah keluar dari wilayah RT', 4, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-DOM', 'Surat Domisili', 'sk-domisili', 'Surat keterangan tempat tinggal', 5,
$$<div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6;color:#000;font-size:14pt;">
<div style="text-align:center;margin-bottom:10px;font-size:13pt;font-weight:bold;text-transform:uppercase;">pemerintahan {{kota}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kecamatan {{kecamatan}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kelurahan {{kelurahan}}</div>
<div style="text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">rukun tetangga {{rt}} / rukun warga {{rw}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:10pt;">{{alamat_kantor}}</div>
<hr style="border:1px solid #000;margin:10px 0 20px;">
<table style="width:100%;font-size:12pt;margin-bottom:20px;"><tr><td style="width:100px;">Nomor</td><td>: {{nomor_surat}}</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: <b>Keterangan Domisili</b></td></tr></table>
<p style="text-align:justify;text-indent:40px;">Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama</td><td>: {{nama}}</td></tr><tr><td>NIK</td><td>: {{nik}}</td></tr><tr><td>Tempat, Tanggal Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr><tr><td>Jenis Kelamin</td><td>: {{jenis_kelamin}}</td></tr><tr><td>Agama</td><td>: {{agama}}</td></tr><tr><td>Pekerjaan</td><td>: {{pekerjaan}}</td></tr><tr><td>Alamat</td><td>: {{alamat}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Orang tersebut di atas benar-benar berdomisili di alamat tersebut sejak {{sejak}} dan surat keterangan domisili ini dibuat untuk keperluan {{keperluan}}.</p>
<p style="text-align:justify;text-indent:40px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div style="text-align:right;margin-top:40px;"><p style="margin-right:30px;">{{kota}}, {{tanggal_sekarang}}</p><br><br><br><p style="margin-right:30px;font-weight:bold;text-decoration:underline;">{{nama_ketua_rt}}</p><p style="margin-right:30px;">Ketua RT {{rt}} / RW {{rw}}</p></div></div>$$),
(v_tenant_id, (SELECT id FROM cat), 'SK-TINGGAL-SMT', 'Surat Keterangan Tempat Tinggal Sementara', 'sk-tinggal-sementara', 'Untuk warga yang tinggal sementara di wilayah RT', 6, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SP-EKTP', 'Surat Pengantar e-KTP (Rekam Data)', 'sp-ektp', 'Untuk perekaman data e-KTP', 7, NULL);

-- DOMISILI & HUNIAN (cat 2)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'domisili-hunian' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SK-DOM-WRG', 'Surat Keterangan Domisili Warga', 'sk-domisili-warga', 'Keterangan domisili untuk warga tetap', 1),
(v_tenant_id, (SELECT id FROM cat), 'SK-DOM-USAHA', 'Surat Keterangan Domisili Usaha', 'sk-domisili-usaha', 'Keterangan domisili untuk lokasi usaha', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-KONTRAK', 'Surat Keterangan Kontrak / Sewa Rumah', 'sk-kontrak-sewa', 'Keterangan status kontrak atau sewa rumah', 3),
(v_tenant_id, (SELECT id FROM cat), 'SP-IMB', 'Surat Pengantar Pembuatan IMB/PBG', 'sp-imb', 'Pengantar pembuatan Izin Mendirikan Bangunan', 4),
(v_tenant_id, (SELECT id FROM cat), 'SK-RUMAH', 'Surat Keterangan Kepemilikan / Penguasaan Rumah', 'sk-kepemilikan-rumah', 'Keterangan status kepemilikan rumah non-legal', 5);

-- EKONOMI & USAHA (cat 3)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'ekonomi-usaha' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order, template_html) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SKU', 'Surat Keterangan Usaha (SKU)', 'sku', 'Surat keterangan untuk usaha mikro dan kecil', 1,
$$<div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6;color:#000;font-size:14pt;">
<div style="text-align:center;margin-bottom:10px;font-size:13pt;font-weight:bold;text-transform:uppercase;">pemerintahan {{kota}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kecamatan {{kecamatan}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kelurahan {{kelurahan}}</div>
<div style="text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">rukun tetangga {{rt}} / rukun warga {{rw}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:10pt;">{{alamat_kantor}}</div>
<hr style="border:1px solid #000;margin:10px 0 20px;">
<table style="width:100%;font-size:12pt;margin-bottom:20px;"><tr><td style="width:100px;">Nomor</td><td>: {{nomor_surat}}</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: <b>Keterangan Usaha</b></td></tr></table>
<p style="text-align:justify;text-indent:40px;">Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama</td><td>: {{nama}}</td></tr><tr><td>NIK</td><td>: {{nik}}</td></tr><tr><td>Tempat, Tanggal Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr><tr><td>Jenis Kelamin</td><td>: {{jenis_kelamin}}</td></tr><tr><td>Agama</td><td>: {{agama}}</td></tr><tr><td>Pekerjaan</td><td>: {{pekerjaan}}</td></tr><tr><td>Alamat</td><td>: {{alamat}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Orang tersebut di atas adalah warga RT {{rt}} / RW {{rw}} yang memiliki dan menjalankan usaha dengan keterangan sebagai berikut:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama Usaha</td><td>: {{nama_usaha}}</td></tr><tr><td>Jenis Usaha</td><td>: {{jenis_usaha}}</td></tr><tr><td>Alamat Usaha</td><td>: {{alamat_usaha}}</td></tr><tr><td>Modal Usaha</td><td>: Rp {{modal_usaha}}</td></tr><tr><td>Mulai Usaha</td><td>: {{mulai_usaha}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Surat keterangan usaha ini dibuat untuk keperluan {{keperluan}}.</p>
<p style="text-align:justify;text-indent:40px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div style="text-align:right;margin-top:40px;"><p style="margin-right:30px;">{{kota}}, {{tanggal_sekarang}}</p><br><br><br><p style="margin-right:30px;font-weight:bold;text-decoration:underline;">{{nama_ketua_rt}}</p><p style="margin-right:30px;">Ketua RT {{rt}} / RW {{rw}}</p></div></div>$$),
(v_tenant_id, (SELECT id FROM cat), 'SP-NIB', 'Surat Pengantar NIB / OSS', 'sp-nib', 'Pengantar pembuatan Nomor Induk Berusaha', 2, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-PENGHASILAN', 'Surat Keterangan Penghasilan', 'sk-penghasilan', 'Keterangan besaran penghasilan warga', 3, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-TDK-BEKERJA', 'Surat Keterangan Tidak Bekerja', 'sk-tidak-bekerja', 'Keterangan status tidak bekerja', 4, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-UMKM', 'Surat Keterangan UMKM Aktif', 'sk-umkm', 'Keterangan keaktifan usaha UMKM', 5, NULL);

-- SOSIAL & BANTUAN (cat 4)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'sosial-bantuan' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order, template_html) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SKTM', 'Surat Keterangan Tidak Mampu (SKTM)', 'sktm', 'Untuk keperluan keringanan biaya dan bantuan sosial', 1,
$$<div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6;color:#000;font-size:14pt;">
<div style="text-align:center;margin-bottom:10px;font-size:13pt;font-weight:bold;text-transform:uppercase;">pemerintahan {{kota}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kecamatan {{kecamatan}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kelurahan {{kelurahan}}</div>
<div style="text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">rukun tetangga {{rt}} / rukun warga {{rw}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:10pt;">{{alamat_kantor}}</div>
<hr style="border:1px solid #000;margin:10px 0 20px;">
<table style="width:100%;font-size:12pt;margin-bottom:20px;"><tr><td style="width:100px;">Nomor</td><td>: {{nomor_surat}}</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: <b>Keterangan Tidak Mampu</b></td></tr></table>
<p style="text-align:justify;text-indent:40px;">Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama</td><td>: {{nama}}</td></tr><tr><td>NIK</td><td>: {{nik}}</td></tr><tr><td>Tempat, Tanggal Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr><tr><td>Jenis Kelamin</td><td>: {{jenis_kelamin}}</td></tr><tr><td>Agama</td><td>: {{agama}}</td></tr><tr><td>Pekerjaan</td><td>: {{pekerjaan}}</td></tr><tr><td>Alamat</td><td>: {{alamat}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Berdasarkan data yang ada, orang tersebut di atas adalah warga kurang mampu dengan penghasilan rata-rata Rp {{penghasilan_per_bulan}} per bulan dan memiliki tanggungan sebanyak {{jumlah_tanggungan}} orang.</p>
<p style="text-align:justify;text-indent:40px;">Surat keterangan ini dibuat untuk keperluan {{keperluan}}.</p>
<p style="text-align:justify;text-indent:40px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div style="text-align:right;margin-top:40px;"><p style="margin-right:30px;">{{kota}}, {{tanggal_sekarang}}</p><br><br><br><p style="margin-right:30px;font-weight:bold;text-decoration:underline;">{{nama_ketua_rt}}</p><p style="margin-right:30px;">Ketua RT {{rt}} / RW {{rw}}</p></div></div>$$),
(v_tenant_id, (SELECT id FROM cat), 'SP-BANSOS', 'Surat Pengantar Bantuan Sosial', 'sp-bansos', 'Pengantar untuk mendapatkan bantuan sosial', 2, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-WRG-MISKIN', 'Surat Keterangan Warga Miskin', 'sk-warga-miskin', 'Keterangan status warga miskin', 3, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-REK-BANTUAN', 'Surat Rekomendasi Bantuan', 'sk-rekomendasi-bantuan', 'Rekomendasi untuk pengajuan bantuan', 4, NULL);

-- HUKUM & ADMINISTRATIF (cat 5)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'hukum-administratif' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SP-SKCK', 'Surat Pengantar SKCK', 'sp-sckk', 'Pengantar pembuatan Surat Keterangan Catatan Kepolisian', 1),
(v_tenant_id, (SELECT id FROM cat), 'SP-CAT-SIPIL', 'Surat Pengantar Catatan Sipil', 'sp-catatan-sipil', 'Pengantar urusan catatan sipil', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-IDENTITAS', 'Surat Keterangan Identitas (Dokumen Hilang)', 'sk-identitas', 'Keterangan identitas untuk dokumen yang hilang', 3),
(v_tenant_id, (SELECT id FROM cat), 'SP-LEGALISASI', 'Surat Pengantar Legalisasi Dokumen', 'sp-legalisasi', 'Pengantar legalisasi dokumen kependudukan', 4),
(v_tenant_id, (SELECT id FROM cat), 'SK-KUASA', 'Surat Kuasa (Diketahui RT)', 'sk-kuasa', 'Surat kuasa yang diketahui oleh RT', 5),
(v_tenant_id, (SELECT id FROM cat), 'SK-PERNYATAAN', 'Surat Pernyataan (Diketahui RT)', 'sk-pernyataan', 'Surat pernyataan yang diketahui oleh RT', 6);

-- PERNIKAHAN & KELUARGA (cat 6)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'pernikahan-keluarga' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SP-NIKAH', 'Surat Pengantar Nikah (KUA / Catatan Sipil)', 'sp-nikah', 'Pengantar pendaftaran pernikahan', 1),
(v_tenant_id, (SELECT id FROM cat), 'SK-BLM-NIKAH', 'Surat Keterangan Belum Menikah', 'sk-belum-menikah', 'Keterangan status belum menikah', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-STATUS', 'Surat Keterangan Status (Duda/Janda)', 'sk-status', 'Keterangan status duda atau janda', 3),
(v_tenant_id, (SELECT id FROM cat), 'SK-IZIN-ORTU', 'Surat Izin Orang Tua (Diketahui RT)', 'sk-izin-ortu', 'Izin orang tua yang diketahui RT', 4);

-- KEMATIAN (cat 7)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'kematian' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order, template_html) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SK-KEMATIAN', 'Surat Keterangan Kematian', 'sk-kematian', 'Keterangan untuk peristiwa kematian warga', 1,
$$<div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6;color:#000;font-size:14pt;">
<div style="text-align:center;margin-bottom:10px;font-size:13pt;font-weight:bold;text-transform:uppercase;">pemerintahan {{kota}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kecamatan {{kecamatan}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:12pt;font-weight:bold;text-transform:uppercase;">kelurahan {{kelurahan}}</div>
<div style="text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">rukun tetangga {{rt}} / rukun warga {{rw}}</div>
<div style="text-align:center;margin-bottom:5px;font-size:10pt;">{{alamat_kantor}}</div>
<hr style="border:1px solid #000;margin:10px 0 20px;">
<table style="width:100%;font-size:12pt;margin-bottom:20px;"><tr><td style="width:100px;">Nomor</td><td>: {{nomor_surat}}</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: <b>Keterangan Kematian</b></td></tr></table>
<p style="text-align:justify;text-indent:40px;">Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa pada hari <b>{{hari}}</b> tanggal <b>{{tanggal_meninggal}}</b> telah meninggal dunia:</p>
<table style="width:100%;font-size:12pt;margin:15px 0;"><tr><td style="width:140px;">Nama</td><td>: {{nama_meninggal}}</td></tr><tr><td>NIK</td><td>: {{nik_meninggal}}</td></tr><tr><td>Tempat Meninggal</td><td>: {{tempat_meninggal}}</td></tr><tr><td>Penyebab</td><td>: {{penyebab}}</td></tr><tr><td>Dimakamkan di</td><td>: {{tempat_dimakamkan}}</td></tr></table>
<p style="text-align:justify;text-indent:40px;">Almarhum/Arlmarhumah adalah warga RT {{rt}} / RW {{rw}} yang bertempat tinggal di {{alamat}}.</p>
<p style="text-align:justify;text-indent:40px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div style="text-align:right;margin-top:40px;"><p style="margin-right:30px;">{{kota}}, {{tanggal_sekarang}}</p><br><br><br><p style="margin-right:30px;font-weight:bold;text-decoration:underline;">{{nama_ketua_rt}}</p><p style="margin-right:30px;">Ketua RT {{rt}} / RW {{rw}}</p></div></div>$$),
(v_tenant_id, (SELECT id FROM cat), 'SP-AKTA-KEMATIAN', 'Surat Pengantar Akta Kematian', 'sp-akta-kematian', 'Pengantar pembuatan akta kematian', 2, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SK-PEMAKAMAN', 'Surat Keterangan Pemakaman', 'sk-pemakaman', 'Keterangan untuk keperluan pemakaman', 3, NULL),
(v_tenant_id, (SELECT id FROM cat), 'SP-SANTUNAN', 'Surat Pengantar Santunan Kematian', 'sp-santunan', 'Pengantar pengajuan santunan kematian', 4, NULL);

-- PENDIDIKAN (cat 8)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'pendidikan' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SK-DOM-SEKOLAH', 'Surat Keterangan Domisili Sekolah', 'sk-domisili-sekolah', 'Keterangan domisili untuk keperluan sekolah', 1),
(v_tenant_id, (SELECT id FROM cat), 'SP-BEASISWA', 'Surat Pengantar Beasiswa', 'sp-beasiswa', 'Pengantar pengajuan beasiswa', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-ORTU-SEKOLAH', 'Surat Keterangan Orang Tua (Untuk Sekolah)', 'sk-ortu-sekolah', 'Keterangan orang tua untuk kepentingan sekolah', 3);

-- KEAMANAN & LINGKUNGAN (cat 9)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'keamanan-lingkungan' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SP-LAP-KEHILANGAN', 'Surat Pengantar Laporan Kehilangan', 'sp-laporan-kehilangan', 'Pengantar untuk laporan kehilangan', 1),
(v_tenant_id, (SELECT id FROM cat), 'SK-IZIN-KERAMAIAN', 'Surat Izin Keramaian / Acara', 'sk-izin-keramaian', 'Izin untuk mengadakan acara/keramaian', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-IZIN-LINGKUNGAN', 'Surat Izin Lingkungan (Hajatan, dll)', 'sk-izin-lingkungan', 'Izin kegiatan yang mempengaruhi lingkungan', 3),
(v_tenant_id, (SELECT id FROM cat), 'SK-TAMU-MENGINAP', 'Surat Keterangan Tamu Menginap', 'sk-tamu-menginap', 'Keterangan untuk tamu yang menginap', 4);

-- LAIN-LAIN (cat 10)
WITH cat AS (SELECT id FROM administrasi_categories WHERE slug = 'lain-lain' AND tenant_id = v_tenant_id)
INSERT INTO administrasi_letter_types (tenant_id, category_id, code, name, slug, description, sort_order) VALUES
(v_tenant_id, (SELECT id FROM cat), 'SK-AHLI-WARIS', 'Surat Keterangan Ahli Waris', 'sk-ahli-waris', 'Keterangan awal untuk pengurusan ahli waris', 1),
(v_tenant_id, (SELECT id FROM cat), 'SK-HUTANG-PIUTANG', 'Surat Pernyataan Hutang Piutang (Diketahui RT)', 'sk-hutang-piutang', 'Pernyataan hutang piutang yang diketahui RT', 2),
(v_tenant_id, (SELECT id FROM cat), 'SK-REKOMENDASI', 'Surat Rekomendasi Pribadi', 'sk-rekomendasi', 'Rekomendasi untuk kepentingan pribadi warga', 3),
(v_tenant_id, (SELECT id FROM cat), 'SK-KLARIFIKASI', 'Surat Klarifikasi / Mediasi Konflik', 'sk-klarifikasi', 'Klarifikasi atau mediasi konflik warga', 4),
(v_tenant_id, (SELECT id FROM cat), 'SK-KEHILANGAN-DOK', 'Surat Keterangan Kehilangan Dokumen', 'sk-kehilangan-dokumen', 'Keterangan untuk dokumen yang hilang', 5),
(v_tenant_id, (SELECT id FROM cat), 'SK-DUKUNGAN', 'Surat Dukungan Warga (Proposal, dll)', 'sk-dukungan', 'Dukungan warga untuk proposal dan pengajuan', 6);

-- === FORM FIELDS ===

-- SKU fields
SELECT id INTO v_sku_id FROM administrasi_letter_types WHERE code = 'SKU' AND tenant_id = v_tenant_id;
INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, placeholder, is_required, sort_order) VALUES
(v_sku_id, 'nama_usaha', 'Nama Usaha', 'text', 'Masukkan nama usaha', true, 1),
(v_sku_id, 'jenis_usaha', 'Jenis Usaha', 'text', 'Misal: Kuliner, Fashion, dll', true, 2),
(v_sku_id, 'alamat_usaha', 'Alamat Usaha', 'textarea', 'Alamat lengkap tempat usaha', true, 3),
(v_sku_id, 'modal_usaha', 'Modal Usaha (Rp)', 'text', 'Perkiraan modal usaha', false, 4),
(v_sku_id, 'mulai_usaha', 'Mulai Usaha', 'date', 'Tanggal mulai usaha', false, 5);

-- SKTM fields
SELECT id INTO v_sktm_id FROM administrasi_letter_types WHERE code = 'SKTM' AND tenant_id = v_tenant_id;
INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, placeholder, is_required, sort_order) VALUES
(v_sktm_id, 'penghasilan_per_bulan', 'Penghasilan per Bulan (Rp)', 'text', 'Rata-rata penghasilan bulanan', true, 1),
(v_sktm_id, 'jumlah_tanggungan', 'Jumlah Tanggungan', 'number', 'Jumlah orang yang ditanggung', true, 2),
(v_sktm_id, 'keperluan', 'Keperluan', 'textarea', 'Untuk keperluan apa surat ini dibuat', true, 3),
(v_sktm_id, 'keterangan', 'Keterangan Tambahan', 'textarea', 'Informasi lain yang relevan', false, 4);

-- SP-KTP fields
SELECT id INTO v_sp_ktp_id FROM administrasi_letter_types WHERE code = 'SP-KTP' AND tenant_id = v_tenant_id;
INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, field_options, placeholder, is_required, sort_order) VALUES
(v_sp_ktp_id, 'jenis_permohonan', 'Jenis Permohonan', 'select', '[{"label":"KTP Baru","value":"baru"},{"label":"Perpanjangan","value":"perpanjangan"}]', NULL, true, 1),
(v_sp_ktp_id, 'alasan', 'Alasan / Keterangan', 'textarea', NULL, 'Alasan pembuatan atau perpanjangan KTP', false, 2);

-- SK-DOM fields
SELECT id INTO v_sk_dom_id FROM administrasi_letter_types WHERE code = 'SK-DOM' AND tenant_id = v_tenant_id;
INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, placeholder, is_required, sort_order) VALUES
(v_sk_dom_id, 'sejak', 'Domisili Sejak', 'date', 'Sejak kapan berdomisili', true, 1),
(v_sk_dom_id, 'keperluan', 'Keperluan', 'textarea', 'Untuk keperluan apa surat ini dibuat', true, 2);

-- SK-KEMATIAN fields
SELECT id INTO v_sk_kematian_id FROM administrasi_letter_types WHERE code = 'SK-KEMATIAN' AND tenant_id = v_tenant_id;
INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, placeholder, is_required, sort_order) VALUES
(v_sk_kematian_id, 'nama_meninggal', 'Nama Almarhum/Almarhumah', 'text', 'Nama lengkap yang meninggal', true, 1),
(v_sk_kematian_id, 'nik_meninggal', 'NIK Almarhum/Almarhumah', 'text', 'NIK yang meninggal (16 digit)', true, 2),
(v_sk_kematian_id, 'tempat_meninggal', 'Tempat Meninggal', 'text', 'Tempat terjadinya kematian', true, 3),
(v_sk_kematian_id, 'tanggal_meninggal', 'Tanggal Meninggal', 'date', 'Tanggal kematian', true, 4),
(v_sk_kematian_id, 'penyebab', 'Penyebab Kematian', 'text', 'Sebab meninggal dunia', false, 5),
(v_sk_kematian_id, 'tempat_dimakamkan', 'Tempat Pemakaman', 'text', 'Lokasi pemakaman', false, 6);

-- Generic fields for letter types that don't have custom fields yet
-- For these, just add a "keperluan" field
FOR v_sku_id IN SELECT id FROM administrasi_letter_types WHERE tenant_id = v_tenant_id AND id NOT IN (v_sku_id, v_sktm_id, v_sp_ktp_id, v_sk_dom_id, v_sk_kematian_id)
LOOP
  INSERT INTO administrasi_letter_fields (letter_type_id, field_key, field_label, field_type, placeholder, is_required, sort_order) VALUES
  (v_sku_id, 'keperluan', 'Keperluan', 'textarea', 'Untuk keperluan apa surat ini dibuat', true, 1),
  (v_sku_id, 'keterangan', 'Keterangan Tambahan', 'textarea', 'Informasi lain yang relevan', false, 2);
END LOOP;

-- === NUMBER CONFIG ===
INSERT INTO administrasi_number_configs (tenant_id, format_pattern, reset_frequency, last_sequence, last_reset_year, rt, rw, kelurahan, kecamatan, kota, provinsi, alamat_kantor, nama_ketua_rt)
VALUES (
  v_tenant_id,
  '{sequence}/{letter_code}/RT.{rt}/RW.{rw}/{month_roman}/{year}',
  'yearly',
  0,
  2026,
  '03',
  '14',
  'Sawangan',
  'Sawangan Baru',
  'Kota Depok',
  'Jawa Barat',
  'Perumahan Sawangan Regensi, RT 03 / RW 14, Kel. Sawangan Baru, Kec. Sawangan, Kota Depok',
  'Ketua RT'
);

END $do$;
