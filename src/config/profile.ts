/**
 * Profile Page Configuration
 *
 * Centralizes all configuration constants for the profile page.
 * Following the Open-Closed Principle: open for extension, closed for modification.
 */

// ─── API Endpoints ────────────────────────────────────────────────────────────

export const PROFILE_API_ENDPOINTS = {
  PROFILE: '/api/profile',
  AVATAR: '/api/profile/avatar',
  CHECK_USERNAME: '/api/profile/check/username',
  CHECK_WA_NUMBER: '/api/profile/check/wa-number',
  LOGOUT: '/api/auth/logout',
  CHANGE_PIN: '/api/auth/change-pin',
  FAMILY_ADD_MEMBER: '/api/family/add-member',
  FAMILY_TRANSFER_OWNER: '/api/family/transfer-owner',
  FAMILY_REMOVE_MEMBER: '/api/family/remove-member',
  JOIN_REQUEST_RESPOND: '/api/house-join-requests/respond',
} as const;

// ─── Validation Rules ─────────────────────────────────────────────────────────

export const VALIDATION_RULES = {
  FULL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  WA_NUMBER: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^[0-9]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PIN: {
    LENGTH: 4,
    PATTERN: /^[0-9]{4}$/,
  },
} as const;

// ─── Avatar Upload Configuration ──────────────────────────────────────────────

export const AVATAR_CONFIG = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
  BUCKET_NAME: 'avatars',
} as const;

// Type for checking file types at runtime
export type AvatarAllowedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

// ─── Relationship Labels ──────────────────────────────────────────────────────

/**
 * Maps relationship codes to display labels in Indonesian
 */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  OWNER: 'Kepala Rumah Tangga',
  FAMILY: 'Keluarga',
  TENANT: 'Penyewa',
  CARETAKER: 'Penjaga',
} as const;

// ─── PIN Configuration ────────────────────────────────────────────────────────

export const PIN_CONFIG = {
  LENGTH: 4,
  MIN_VALUE: 0,
  MAX_VALUE: 9999,
  INPUT_TYPE: 'numeric' as const,
  AUTOCOMPLETE: 'one-time-code',
} as const;

// ─── Validation Status ────────────────────────────────────────────────────────

export const VALIDATION_STATUS = {
  IDLE: 'idle',
  AVAILABLE: 'available',
  TAKEN: 'taken',
  ERROR: 'error',
} as const;

export type ValidationStatusType = (typeof VALIDATION_STATUS)[keyof typeof VALIDATION_STATUS];

// ─── Error Messages ───────────────────────────────────────────────────────────
// Alias for backward compatibility
export const PROFILE_ERROR_MESSAGES = {
  GENERIC: 'Terjadi kesalahan',
  NETWORK_ERROR: 'Gagal terhubung ke server',
  UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',
  PROFILE_LOAD_FAILED: 'Gagal memuat profil',
  PROFILE_SAVE_FAILED: 'Gagal menyimpan',
  PROFILE_UPDATE_FAILED: 'Gagal memperbarui profil',
  AVATAR_UPLOAD_FAILED: 'Gagal mengunggah foto',
  AVATAR_INVALID_TYPE: 'Format tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC.',
  AVATAR_TOO_LARGE: 'Ukuran file terlalu besar (maks 10MB)',
  VALIDATION_REQUIRED_FIELD: 'Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)',
  VALIDATION_NAME_REQUIRED: 'Nama wajib',
  VALIDATION_NAME_TOO_SHORT: 'Nama minimal 2 karakter',
  VALIDATION_USERNAME_TAKEN: 'Username sudah dipakai',
  VALIDATION_WA_NUMBER_REQUIRED: 'Nomor WhatsApp wajib',
  VALIDATION_WA_NUMBER_TAKEN: 'Nomor WhatsApp sudah dipakai',
  PIN_CHANGE_FAILED: 'Gagal mengubah PIN',
  PIN_INVALID_LENGTH: 'Semua PIN harus 4 digit',
  PIN_MISMATCH: 'PIN baru dan konfirmasi PIN tidak sama',
  PIN_VALIDATION_FAILED: 'PIN tidak valid',
  FAMILY_ADD_FAILED: 'Gagal menambah anggota',
  TRANSFER_OWNER_FAILED: 'Gagal mengalihkan',
  REMOVE_MEMBER_FAILED: 'Gagal mengeluarkan',
  JOIN_REQUEST_RESPOND_FAILED: 'Gagal menanggapi permintaan',
  INVALID_ACTION: 'Aksi tidak valid',
  THEME_UPDATE_FAILED: 'Gagal memperbarui tema',
  // Additional aliases used in code
  ADD_MEMBER_FAILED: 'Gagal menambah anggota',
  SAVE_FAILED: 'Gagal menyimpan',
  VALIDATION_FAILED: 'Validasi gagal',
  FULL_NAME_REQUIRED: 'Nama wajib',
  FULL_NAME_TOO_SHORT: 'Nama minimal 2 karakter',
  FULL_NAME_TOO_LONG: 'Nama maksimal 100 karakter',
  USERNAME_REQUIRED: 'Username wajib',
  USERNAME_TOO_SHORT: 'Username minimal 3 karakter',
  USERNAME_TOO_LONG: 'Username maksimal 30 karakter',
  RESPOND_REQUEST_FAILED: 'Gagal menanggapi permintaan',
};

export const ERROR_MESSAGES = {
  // General errors
  GENERIC: 'Terjadi kesalahan',
  NETWORK_ERROR: 'Gagal terhubung ke server',
  UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',

  // Profile errors
  PROFILE_LOAD_FAILED: 'Gagal memuat profil',
  PROFILE_SAVE_FAILED: 'Gagal menyimpan',
  PROFILE_UPDATE_FAILED: 'Gagal memperbarui profil',

  // Avatar errors
  AVATAR_UPLOAD_FAILED: 'Gagal mengunggah foto',
  AVATAR_INVALID_TYPE: 'Format tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC.',
  AVATAR_TOO_LARGE: 'Ukuran file terlalu besar (maks 10MB)',

  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)',
  VALIDATION_NAME_REQUIRED: 'Nama wajib',
  VALIDATION_NAME_TOO_SHORT: 'Nama minimal 2 karakter',
  VALIDATION_USERNAME_TAKEN: 'Username sudah dipakai',
  VALIDATION_WA_NUMBER_REQUIRED: 'Nomor WhatsApp wajib',
  VALIDATION_WA_NUMBER_TAKEN: 'Nomor WhatsApp sudah dipakai',

  // PIN errors
  PIN_CHANGE_FAILED: 'Gagal mengubah PIN',
  PIN_INVALID_LENGTH: 'Semua PIN harus 4 digit',
  PIN_MISMATCH: 'PIN baru dan konfirmasi PIN tidak sama',

  // Family management errors
  FAMILY_ADD_FAILED: 'Gagal menambah anggota',
  FAMILY_TRANSFER_FAILED: 'Gagal mengalihkan',
  FAMILY_REMOVE_FAILED: 'Gagal mengeluarkan',

  // Join request errors
  JOIN_REQUEST_RESPOND_FAILED: 'Gagal menanggapi permintaan',
} as const;

// ─── Success Messages ─────────────────────────────────────────────────────────

export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profil berhasil diperbarui',
  AVATAR_UPLOADED: 'Foto profil berhasil diubah',
  PIN_CHANGED: 'PIN berhasil diubah',
  FAMILY_MEMBER_ADDED: 'Anggota keluarga berhasil ditambahkan',
  FAMILY_OWNER_TRANSFERRED: 'Kepemilikan berhasil dialihkan',
  FAMILY_MEMBER_REMOVED: 'Anggota berhasil dikeluarkan',
  JOIN_REQUEST_APPROVED: 'Permintaan bergabung disetujui',
  JOIN_REQUEST_REJECTED: 'Permintaan bergabung ditolak',
} as const;

// ─── Loading Messages ─────────────────────────────────────────────────────────

export const LOADING_MESSAGES = {
  PROFILE: 'Memuat profil...',
  SAVING: 'Menyimpan...',
  UPLOADING: 'Mengunggah...',
  CHECKING: 'Memeriksa...',
  PROCESSING: 'Memproses...',
} as const;

// ─── UI Configuration ─────────────────────────────────────────────────────────

export const UI_CONFIG = {
  ANIMATIONS: {
    FADE_IN_DURATION: '0.2s',
    SHEET_UP_DURATION: '0.3s',
    DIALOG_IN_DURATION: '0.25s',
    FADE_IN_CURVE: 'ease',
    SHEET_UP_CURVE: 'cubic-bezier(0.34,1.4,0.64,1)',
    DIALOG_IN_CURVE: 'cubic-bezier(0.34,1.56,0.64,1)',
  },
  DIMENSIONS: {
    DIALOG_MAX_WIDTH: '360px',
    SHEET_MAX_WIDTH: 'var(--app-max-width)',
    AVATAR_SIZE: {
      SMALL: '40px',
      MEDIUM: '64px',
      LARGE: '96px',
    },
  },
  DEBOUNCE: {
    USERNAME_CHECK_MS: 500,
    WA_NUMBER_CHECK_MS: 500,
  },
} as const;

// Aliases for backward compatibility
export const DEBOUNCE_MS = 500;

// ─── Form Defaults ────────────────────────────────────────────────────────────

export const FORM_DEFAULTS = {
  FULL_NAME: '',
  USERNAME: '',
  WA_NUMBER: '',
  EMAIL: '',
  DATE_OF_BIRTH: '',
  CURRENT_PIN: '',
  NEW_PIN: '',
  CONFIRM_NEW_PIN: '',
} as const;

// ─── Breadcrumbs & Labels ─────────────────────────────────────────────────────

export const FAMILY_MEMBER_LABELS = {
  FULL_NAME_REQUIRED: 'Nama lengkap wajib diisi',
  FULL_NAME_MIN_LENGTH: 'Nama minimal 2 karakter',
  WA_NUMBER_REQUIRED: 'Nomor WhatsApp wajib diisi',
  TRANSFER_OWNER_TITLE: 'Alihkan Kepemilikan?',
  TRANSFER_OWNER_CONFIRM: 'Ya, Alihkan',
  REMOVE_MEMBER_TITLE: 'Keluarkan Anggota?',
  REMOVE_MEMBER_CONFIRM: 'Ya, Keluarkan',
} as const;

export const LABELS = {
  BREADCRUMB: 'Akun',
  PAGE_TITLE: 'Profil Saya',
  FULL_NAME: 'Nama Lengkap',
  USERNAME: 'Username',
  WA_NUMBER: 'Nomor WhatsApp',
  EMAIL: 'Email',
  DATE_OF_BIRTH: 'Tanggal Lahir',
  CURRENT_PIN: 'PIN Saat Ini',
  NEW_PIN: 'PIN Baru',
  CONFIRM_NEW_PIN: 'Konfirmasi PIN Baru',
  THEME: 'Tema Warna',
  AVATAR: 'Foto Profil',
  FAMILY: 'Keluarga',
  JOIN_REQUESTS: 'Permintaan Bergabung',
} as const;

// ─── Button Labels ────────────────────────────────────────────────────────────

export const BUTTON_LABELS = {
  SAVE: 'Simpan',
  CANCEL: 'Batal',
  EDIT: 'Edit Profil',
  CHANGE_PIN: 'Ubah PIN',
  CHANGE_AVATAR: 'Ubah Foto',
  LOGOUT: 'Keluar',
  ADD_MEMBER: 'Tambah Anggota',
  TRANSFER_OWNER: 'Alihkan Kepemilikan',
  REMOVE_MEMBER: 'Keluarkan',
  APPROVE: 'Setujui',
  REJECT: 'Tolak',
  MANAGE_FAMILY: 'Kelola Keluarga',
  CLOSE: 'Tutup',
} as const;

// ─── Dialog Configuration ─────────────────────────────────────────────────────

export const DIALOG_CONFIG = {
  TRANSFER_OWNER: {
    TITLE: 'Alihkan Kepemilikan?',
    MESSAGE: 'Kepemilikan rumah ini akan dialihkan. Anda masih terdaftar sebagai anggota keluarga.',
    CONFIRM_LABEL: 'Ya, Alihkan',
    DANGER: false,
  },
  REMOVE_MEMBER: {
    TITLE: 'Keluarkan Anggota?',
    MESSAGE: 'Anggota ini akan dihapus dari daftar keluarga.',
    CONFIRM_LABEL: 'Ya, Keluarkan',
    DANGER: true,
  },
} as const;

// ─── Route Configuration ──────────────────────────────────────────────────────

export const ROUTES = {
  LOGIN: '/auth/login',
  LANDING: '/landing',
  PROFILE: '/profil',
} as const;

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  ENABLE_AVATAR_UPLOAD: true,
  ENABLE_PIN_CHANGE: true,
  ENABLE_FAMILY_MANAGEMENT: true,
  ENABLE_THEME_SELECTION: true,
  ENABLE_USERNAME_CHECK: true,
  ENABLE_WA_NUMBER_CHECK: true,
  ENABLE_EMAIL_VALIDATION: false,
} as const;

// ─── Date & Time Configuration ────────────────────────────────────────────────

export const DATE_CONFIG = {
  LOCALE: 'id-ID',
  FORMAT: {
    DAY: 'numeric',
    MONTH: 'long',
    YEAR: 'numeric',
  },
  INPUT_FORMAT: 'yyyy-MM-dd',
  FALLBACK_DISPLAY: '—',
} as const;

// ─── HTTP Methods ─────────────────────────────────────────────────────────────

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// ─── Content Types ────────────────────────────────────────────────────────────

export const CONTENT_TYPES = {
  JSON: 'application/json',
  MULTIPART: 'multipart/form-data',
} as const;

// ─── Join Request Actions ─────────────────────────────────────────────────────

export const JOIN_REQUEST_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type JoinRequestAction = (typeof JOIN_REQUEST_ACTIONS)[keyof typeof JOIN_REQUEST_ACTIONS];
