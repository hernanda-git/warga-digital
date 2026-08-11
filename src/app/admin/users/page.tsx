"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  CameraIcon,
  KeyIcon,
  StopIcon,
  PlayIcon,
  ShieldCheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  HomeModernIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { PageLoader, Avatar } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface UserItem {
  user_id: string;
  tenant_user_id: string;
  full_name: string;
  username: string | null;
  wa_number: string | null;
  email: string | null;
  blok_rumah: string | null;
  status: string;
  joined_at: string | null;
  roles: string[];
  last_active_at: string | null;
  avatar_path: string | null;
  profile_picture_url: string | null;
}

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "—";

  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 0) return "Baru saja";
  if (diffSec < 60) return "Baru saja";

  const totalMenit = Math.floor(diffSec / 60);
  const totalJam = Math.floor(totalMenit / 60);
  const totalHari = Math.floor(totalJam / 24);
  const totalMinggu = Math.floor(totalHari / 7);
  const totalBulan = Math.floor(totalHari / 30);
  const totalTahun = Math.floor(totalHari / 365);

  const parts: string[] = [];

  if (totalTahun > 0) {
    parts.push(`${totalTahun} tahun`);
    const sisaHari = totalHari % 365;
    const sisaBulan = Math.floor(sisaHari / 30);
    if (sisaBulan > 0) parts.push(`${sisaBulan} bulan`);
  } else if (totalBulan > 0) {
    parts.push(`${totalBulan} bulan`);
    const sisaHari = totalHari % 30;
    if (sisaHari > 0) parts.push(`${sisaHari} hari`);
  } else if (totalMinggu > 0) {
    parts.push(`${totalMinggu} minggu`);
    const sisaHari = totalHari % 7;
    if (sisaHari > 0) parts.push(`${sisaHari} hari`);
  } else if (totalHari > 0) {
    parts.push(`${totalHari} hari`);
    const sisaJam = totalJam % 24;
    if (sisaJam > 0) parts.push(`${sisaJam} jam`);
  } else if (totalJam > 0) {
    parts.push(`${totalJam} jam`);
    const sisaMenit = totalMenit % 60;
    if (sisaMenit > 0) parts.push(`${sisaMenit} menit`);
  } else {
    parts.push(`${totalMenit} menit`);
  }

  return `${parts.join(" ")} yang lalu`;
}

function maskEmail(email: string | null): string {
  if (!email) return "\u2014";
  return email.replace(/^(.)(.*?)@(.*)$/, "$1***@$3");
}

function maskWA(wa: string | null): string {
  if (!wa) return "\u2014";
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 8) return wa;
  return `${digits.slice(0, 4)}\u2022\u2022\u2022\u2022${digits.slice(-3)}`;
}

function formatRoleName(name: string): string {
  return name
    .replace(/^(RT_|RW_|SYS_)/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminManageUsersPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [blokList, setBlokList] = useState<string[]>([]);
  const [activeBlok, setActiveBlok] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalAll, setTotalAll] = useState(0);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [modalView, setModalView] = useState<
    "main" | "edit" | "avatar" | "delete" | "house"
  >("main");
  const [confirmResetPin, setConfirmResetPin] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWa, setEditWa] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [houseList, setHouseList] = useState<
    Array<{ id: string; blok_rumah: string }>
  >([]);
  const [houseInput, setHouseInput] = useState("");
  const [houseSuggestions, setHouseSuggestions] = useState<
    Array<{ id: string; blok_rumah: string }>
  >([]);
  const [showHouseSuggestions, setShowHouseSuggestions] = useState(false);
  const [houseSubmitting, setHouseSubmitting] = useState(false);
  const [houseError, setHouseError] = useState<string | null>(null);
  const [houseLoading, setHouseLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/users");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin/users");
            return;
          }
          router.replace("/landing");
          return;
        }
        const profile = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(profile)) {
          router.replace("/landing");
          return;
        }
      } catch {
        router.replace("/landing");
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser]);

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
        sort: sortBy,
      });
      if (query) params.set("q", query);
      if (activeBlok) params.set("blok", activeBlok);

      const res = await apiFetch(`/api/admin/warga?${params.toString()}`);
      const body = (await res.json().catch(() => ({}))) as {
        warga?: UserItem[];
        meta?: { total: number; totalAll: number; page: number; limit: number; hasMore: boolean };
        blokList?: string[];
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat daftar user");
        return;
      }
      setUsers(body.warga ?? []);
      setBlokList(body.blokList ?? []);
      setTotalAll(body.meta?.totalAll ?? 0);
      setTotal(body.meta?.total ?? 0);
      setHasMore(body.meta?.hasMore ?? false);
    } catch {
      setError("Gagal memuat daftar user. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, query, activeBlok, sortBy]);

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadUsers();
    }
  }, [checkingAccess, isAuthenticated, loadUsers]);

  // Reset page to 1 when filters change (but not on page change itself)
  const prevFiltersRef = useRef({ query, activeBlok, sortBy });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.query !== query || prev.activeBlok !== activeBlok || prev.sortBy !== sortBy) {
      setPage(1);
    }
    prevFiltersRef.current = { query, activeBlok, sortBy };
  }, [query, activeBlok, sortBy]);

  const handleSearchInput = useCallback((value: string) => {
    setQueryInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value);
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryInput("");
    setQuery("");
  }, []);

  const openModal = useCallback((user: UserItem) => {
    setSelectedUser(user);
    setModalView("main");
    setConfirmResetPin(false);
    setActionError(null);
    setSuccessMessage(null);
    setEditName(user.full_name);
    setEditEmail(user.email ?? "");
    setEditWa(user.wa_number ?? "");
    setEditUsername(user.username ?? "");
    setEditStatus(user.status);
    setEditError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setDeleteConfirmText("");
    setDeleteError(null);
    setHouseInput("");
    setHouseError(null);
    setShowHouseSuggestions(false);
    setHouseSuggestions([]);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedUser(null);
    setModalView("main");
    setConfirmResetPin(false);
    setActionError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setActionError(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  const showError = useCallback((msg: string) => {
    setActionError(msg);
    setSuccessMessage(null);
  }, []);

  const handleResetPin = useCallback(async () => {
    if (!selectedUser) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await apiFetch("/api/admin/users/send-reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.user_id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        showError(body.error ?? "Gagal mengirim email reset PIN");
        return;
      }
      showSuccess(body.message ?? "Email reset PIN telah dikirim");
      setConfirmResetPin(false);
    } catch {
      showError("Gagal mengirim email reset PIN. Coba lagi.");
    } finally {
      setActing(false);
    }
  }, [selectedUser, showSuccess, showError]);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      setEditError(null);
      setEditSubmitting(true);
      try {
        const res = await apiFetch("/api/admin/users/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.user_id,
            full_name: editName,
            email: editEmail || null,
            wa_number: editWa || null,
            username: editUsername || null,
            status: editStatus,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          success?: boolean;
        };
        if (!res.ok) {
          setEditError(body.error ?? "Gagal menyimpan perubahan");
          return;
        }
        showSuccess("Profil user berhasil diperbarui");
        setModalView("main");
        void loadUsers(true);
      } catch {
        setEditError("Gagal menyimpan perubahan. Coba lagi.");
      } finally {
        setEditSubmitting(false);
      }
    },
    [
      selectedUser,
      editName,
      editEmail,
      editWa,
      editUsername,
      editStatus,
      showSuccess,
      loadUsers,
    ],
  );

  const handleAvatarSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleAvatarUpload = useCallback(async () => {
    if (!selectedUser || !avatarFile) return;
    setAvatarUploading(true);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.append("userId", selectedUser.user_id);
      fd.append("file", avatarFile);
      const res = await apiFetch("/api/admin/users/avatar", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        profilePictureUrl?: string;
      };
      if (!res.ok) {
        showError(body.error ?? "Gagal mengunggah foto");
        return;
      }
      showSuccess("Foto profil berhasil diperbarui");
      setModalView("main");
      setAvatarFile(null);
      setAvatarPreview(null);
      void loadUsers(true);
    } catch {
      showError("Gagal mengunggah foto. Coba lagi.");
    } finally {
      setAvatarUploading(false);
    }
  }, [selectedUser, avatarFile, showSuccess, showError, loadUsers]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.user_id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!res.ok) {
        setDeleteError(body.error ?? "Gagal menghapus user");
        return;
      }
      showSuccess(`User ${selectedUser.full_name} berhasil dihapus`);
      closeModal();
      void loadUsers(true);
    } catch {
      setDeleteError("Gagal menghapus user. Coba lagi.");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [selectedUser, showSuccess, closeModal, loadUsers]);

  const loadHouseList = useCallback(async () => {
    if (houseList.length > 0) return;
    setHouseLoading(true);
    try {
      const res = await apiFetch("/api/admin/houses");
      const body = (await res.json().catch(() => ({}))) as {
        houses?: Array<{ id: string; blok_rumah: string }>;
      };
      if (res.ok && body.houses) {
        setHouseList(body.houses);
      }
    } catch {
    } finally {
      setHouseLoading(false);
    }
  }, []);

  const handleHouseInputChange = useCallback(
    (value: string) => {
      setHouseInput(value);
      const q = value.toLowerCase().trim();
      if (q.length === 0) {
        setHouseSuggestions([]);
        setShowHouseSuggestions(false);
      } else {
        setHouseSuggestions(
          houseList.filter(
            (h) => h.blok_rumah && h.blok_rumah.toLowerCase().includes(q),
          ),
        );
        setShowHouseSuggestions(true);
      }
    },
    [houseList],
  );

  const selectHouseSuggestion = useCallback((blok: string) => {
    setHouseInput(blok);
    setShowHouseSuggestions(false);
  }, []);

  const handleHouseSubmit = useCallback(async () => {
    if (!selectedUser || !houseInput.trim()) return;
    setHouseError(null);
    setHouseSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/users/house", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          newBlokRumah: houseInput.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        blokRumah?: string;
        relationship?: string;
        hadOwner?: boolean;
      };
      if (!res.ok) {
        setHouseError(body.error ?? "Gagal memperbarui blok rumah");
        return;
      }
      const roleLabel = body.relationship === "OWNER" ? "pemilik" : "penghuni";
      const ownershipNote = body.hadOwner
        ? ` (rumah sudah memiliki pemilik, user dijadikan ${roleLabel})`
        : ` (user dijadikan ${roleLabel})`;
      showSuccess(
        `Blok rumah diubah ke ${body.blokRumah ?? houseInput.trim()}${ownershipNote}`,
      );
      setModalView("main");
      void loadUsers(true);
    } catch {
      setHouseError("Gagal memperbarui blok rumah. Coba lagi.");
    } finally {
      setHouseSubmitting(false);
    }
  }, [selectedUser, houseInput, showSuccess, loadUsers]);

  const handleToggleStatus = useCallback(async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActingUserId(selectedUser.user_id);
    setActionError(null);
    try {
      const res = await apiFetch("/api/admin/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          status: newStatus,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!res.ok) {
        showError(body.error ?? "Gagal mengubah status");
        return;
      }
      showSuccess(
        `User ${selectedUser.full_name} ${newStatus === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"}`,
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setEditStatus(newStatus);
      void loadUsers(true);
    } catch {
      showError("Gagal mengubah status. Coba lagi.");
    } finally {
      setActingUserId(null);
    }
  }, [selectedUser, showSuccess, showError, loadUsers]);

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat halaman kelola user..." />;
  }

  const hasActiveFilter = !!query || !!activeBlok;
  const isActive = selectedUser?.status === "ACTIVE";
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Gradient Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
        aria-label="Header halaman kelola user"
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative z-10">
          {/* Nav row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 lg:hidden"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Admin RT · Kelola
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                Kelola User
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void loadUsers(true)}
              disabled={refreshing || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan data"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Stats strip */}
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            aria-label="Ringkasan user"
          >
            {/* Total */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Total
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p className="text-base font-extrabold leading-tight text-white">
                  {totalAll}
                </p>
              )}
            </div>

            {/* Ditampilkan */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Ditampilkan
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p className="text-base font-extrabold leading-tight text-white">
                  {total}
                </p>
              )}
            </div>

            {/* Blok */}
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-medium leading-tight text-white/70">
                Blok
              </p>
              {loading && !refreshing ? (
                <div className="mx-auto mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
              ) : (
                <p className="text-base font-extrabold leading-tight text-white">
                  {blokList.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Search + Filter Bar ────────────────────────────────────── */}
      <div className="shrink-0 space-y-2.5 bg-app-surface-alt px-4 pb-3 pt-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadUsers(true)}
              className="shrink-0 text-xs font-semibold text-red-500 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Search input */}
        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
          <input
            type="search"
            value={queryInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Cari nama, username, WA, atau blok..."
            className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
          />
          {queryInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-app-body-muted/60 hover:text-app-body-muted"
              aria-label="Hapus pencarian"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter pills — blok rumah */}
        {blokList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveBlok("")}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                !activeBlok
                  ? "text-white shadow-sm"
                  : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
              }`}
              style={
                !activeBlok ? { background: "var(--color-primary)" } : undefined
              }
            >
              Semua
            </button>

            {blokList.map((blok) => {
              const isActiveBlok = activeBlok.toLowerCase() === blok.toLowerCase();
              return (
                <button
                  key={blok}
                  type="button"
                  onClick={() => setActiveBlok(isActiveBlok ? "" : blok)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                    isActiveBlok
                      ? "text-white shadow-sm"
                      : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                  }`}
                  style={
                    isActiveBlok
                      ? { background: "var(--color-primary)" }
                      : undefined
                  }
                >
                  {blok}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort controls */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { value: "newest", label: "Terbaru" },
            { value: "oldest", label: "Terlama" },
            { value: "name-asc", label: "Nama A-Z" },
            { value: "name-desc", label: "Nama Z-A" },
            { value: "active", label: "Aktif Terakhir" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                sortBy === opt.value
                  ? "bg-app-primary text-white shadow-sm"
                  : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
              }`}
              style={
                sortBy !== opt.value
                  ? { border: "1px solid var(--color-input-border)" }
                  : undefined
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(actionError || successMessage) && (
        <div className="shrink-0 px-4 pt-3 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
          {actionError && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[12px] text-green-700">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className="shrink-0 border-b border-[var(--color-input-border)] bg-app-surface px-4 py-3 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-body-muted" />
          <input
            type="text"
            placeholder="Cari nama, username, WA, atau blok rumah..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-input-border)] bg-app-surface-alt py-2 pl-9 pr-3 text-[12px] text-app-body placeholder:text-app-body-muted/60 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
        {loading && !refreshing ? (
          /* Skeletons */
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-app-surface p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-app-surface-alt" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-32 rounded-md bg-app-surface-alt" />
                    <div className="h-2.5 w-48 rounded-md bg-app-surface-alt/60" />
                    <div className="h-2.5 w-24 rounded-md bg-app-surface-alt/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationCircleIcon className="h-8 w-8 text-red-400" />
            <p className="mt-3 text-[12px] text-red-600">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-12 text-center">
            <UsersIcon className="h-10 w-10 text-app-body-muted/30" aria-hidden />
            <div>
              <p className="text-sm font-bold text-app-body-muted">
                {hasActiveFilter ? "Tidak ada user yang cocok" : "Belum ada user"}
              </p>
              <p className="mt-1 text-xs text-app-body-muted/70">
                {hasActiveFilter
                  ? "Coba ubah filter atau pencarian Anda"
                  : "User yang bergabung akan muncul di sini"}
              </p>
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setActiveBlok("");
                }}
                className="mt-1 text-xs font-semibold underline underline-offset-2"
                style={{ color: "var(--color-primary)" }}
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {users.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => openModal(user)}
                  className="w-full rounded-2xl bg-app-surface p-3 text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition active:scale-[0.98] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={user.full_name}
                      src={user.profile_picture_url}
                      size={40}
                      className="rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-app-title">
                          {user.full_name}
                        </p>
                        {user.status !== "ACTIVE" && (
                          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            {user.status}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-app-body-muted">
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-3 w-3" />
                          {maskEmail(user.email)}
                        </span>
                        {user.username && <span>@{user.username}</span>}
                        <span>{maskWA(user.wa_number)}</span>
                        <span>{user.blok_rumah || "No blok"}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-app-body-muted/70">
                        Bergabung: {formatJoinedDate(user.joined_at)}
                        {user.roles.length > 0 && (
                          <>
                            {" "}
                            &middot; {user.roles.map(formatRoleName).join(", ")}
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] text-app-body-muted/70">
                        Terakhir Aktif: {formatLastActive(user.last_active_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-input-border)] bg-app-surface text-app-body transition active:scale-95 disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <p className="text-xs font-medium text-app-body-muted">
                  Halaman {page} dari {totalPages}
                </p>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!hasMore}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-input-border)] bg-app-surface text-app-body transition active:scale-95 disabled:opacity-40"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={
              !acting &&
              !editSubmitting &&
              !avatarUploading &&
              !deleteSubmitting
                ? closeModal
                : undefined
            }
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2.5rem)] flex-col rounded-3xl bg-app-surface shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
            style={{
              maxWidth: "400px",
              animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="overflow-y-auto overscroll-contain p-5">
              {modalView === "main" && (
                <>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={selectedUser.full_name}
                        src={selectedUser.profile_picture_url}
                        size={52}
                        className="rounded-xl"
                      />
                      <div>
                        <h2 className="text-[15px] font-extrabold text-app-title leading-tight">
                          {selectedUser.full_name}
                        </h2>
                        {selectedUser.username && (
                          <p className="text-[12px] text-app-body-muted">
                            @{selectedUser.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-surface-alt active:scale-90"
                    >
                      <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-[12px] text-app-body-muted">
                    <p>Email: {maskEmail(selectedUser.email)}</p>
                    <p>WA: {maskWA(selectedUser.wa_number)}</p>
                    <p>Blok: {selectedUser.blok_rumah || "\u2014"}</p>
                    <p>
                      Status:{" "}
                      <span
                        className={
                          isActive
                            ? "font-semibold text-green-600"
                            : "font-semibold text-amber-600"
                        }
                      >
                        {selectedUser.status}
                      </span>
                    </p>
                    <p>Bergabung: {formatJoinedDate(selectedUser.joined_at)}</p>
                    <p>
                      Terakhir Aktif:{" "}
                      {formatLastActive(selectedUser.last_active_at)}
                    </p>
                    {selectedUser.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedUser.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-0.5 rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-bold text-app-primary"
                          >
                            <ShieldCheckIcon className="h-2.5 w-2.5" />
                            {formatRoleName(role)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-2">
                    <button
                      type="button"
                      onClick={() => setConfirmResetPin(true)}
                      disabled={!selectedUser.email || !isActive || acting}
                      title={
                        !selectedUser.email
                          ? "User belum memiliki email"
                          : !isActive
                            ? "Akun user tidak aktif"
                            : "Reset PIN user ini"
                      }
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-app-surface-alt active:scale-[0.98] disabled:opacity-40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary-muted">
                        <KeyIcon className="h-[18px] w-[18px] text-app-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-app-title">
                          Reset PIN
                        </p>
                        <p className="text-[11px] text-app-body-muted">
                          Kirim email reset PIN
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalView("edit")}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-app-surface-alt active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                        <PencilSquareIcon className="h-[18px] w-[18px] text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-app-title">
                          Edit Profil
                        </p>
                        <p className="text-[11px] text-app-body-muted">
                          Nama, email, WA, username, status
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalView("house");
                        setHouseInput(selectedUser.blok_rumah ?? "");
                        setHouseError(null);
                        setShowHouseSuggestions(false);
                        void loadHouseList();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-app-surface-alt active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                        <HomeModernIcon className="h-[18px] w-[18px] text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-app-title">
                          Koreksi Blok Rumah
                        </p>
                        <p className="text-[11px] text-app-body-muted">
                          Ubah blok rumah user ke yang benar
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalView("avatar");
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-app-surface-alt active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
                        <CameraIcon className="h-[18px] w-[18px] text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-app-title">
                          Ganti Foto
                        </p>
                        <p className="text-[11px] text-app-body-muted">
                          Upload foto profil user
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      disabled={actingUserId === selectedUser.user_id}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-app-surface-alt active:scale-[0.98] disabled:opacity-40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                        {isActive ? (
                          <StopIcon className="h-[18px] w-[18px] text-amber-600" />
                        ) : (
                          <PlayIcon className="h-[18px] w-[18px] text-green-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-app-title">
                          {isActive ? "Nonaktifkan" : "Aktifkan"} User
                        </p>
                        <p className="text-[11px] text-app-body-muted">
                          {isActive
                            ? "Suspend akun user"
                            : "Aktifkan kembali akun user"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalView("delete");
                        setDeleteConfirmText("");
                        setDeleteError(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-red-50 active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                        <TrashIcon className="h-[18px] w-[18px] text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-red-600">
                          Hapus User
                        </p>
                        <p className="text-[11px] text-red-500/70">
                          Hapus user secara permanen
                        </p>
                      </div>
                    </button>
                  </div>

                  {confirmResetPin && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[12px] font-semibold text-amber-800">
                        Kirim email reset PIN ke {maskEmail(selectedUser.email)}
                        ?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmResetPin(false)}
                          disabled={acting}
                          className="flex-1 rounded-xl bg-app-surface-alt py-2 text-[12px] font-semibold text-app-body transition active:scale-95 disabled:opacity-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPin}
                          disabled={acting}
                          className="flex-1 rounded-xl bg-red-500 py-2 text-[12px] font-semibold text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
                        >
                          {acting ? "Mengirim..." : "Kirim"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {modalView === "house" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-extrabold text-app-title">
                        Koreksi Blok Rumah
                      </h2>
                      <p className="text-[11px] text-app-body-muted">
                        {selectedUser.full_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("main")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-surface-alt active:scale-90"
                    >
                      <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Blok Rumah Saat Ini
                      </label>
                      <p
                        className="rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-body-muted bg-app-surface-alt"
                        style={{ borderColor: "var(--color-input-border)" }}
                      >
                        {selectedUser.blok_rumah || "\u2014"}
                      </p>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Blok Rumah Baru
                      </label>
                      <input
                        type="text"
                        value={houseInput}
                        onChange={(e) => handleHouseInputChange(e.target.value)}
                        onFocus={() => {
                          if (
                            houseInput.trim().length > 0 &&
                            houseSuggestions.length > 0
                          ) {
                            setShowHouseSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowHouseSuggestions(false), 200);
                        }}
                        placeholder="Ketik atau pilih dari daftar..."
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                      />

                      {showHouseSuggestions && houseSuggestions.length > 0 && (
                        <div
                          className="absolute z-10 mt-1 w-full rounded-xl border bg-app-surface shadow-lg max-h-48 overflow-y-auto"
                          style={{
                            borderColor: "var(--color-input-border)",
                          }}
                        >
                          {houseSuggestions.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onMouseDown={() =>
                                selectHouseSuggestion(h.blok_rumah)
                              }
                              className="w-full px-3.5 py-2 text-left text-[12px] text-app-body hover:bg-app-surface-alt transition first:rounded-t-xl last:rounded-b-xl"
                            >
                              {h.blok_rumah}
                            </button>
                          ))}
                        </div>
                      )}

                      {houseLoading && (
                        <div className="mt-1 flex items-center gap-2 rounded-xl bg-app-surface-alt px-3.5 py-2">
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-app-body-muted" />
                          <span className="text-[11px] text-app-body-muted">
                            Memuat daftar rumah...
                          </span>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const inputUpper = houseInput.trim().toUpperCase();
                      const matchedHouse = houseList.find(
                        (h) => h.blok_rumah === inputUpper,
                      );
                      const isTypedHouseExisting = !!matchedHouse;
                      return (
                        <div
                          className={`rounded-2xl border px-3 py-2.5 ${
                            isTypedHouseExisting
                              ? "border-amber-200 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50"
                          }`}
                        >
                          <p
                            className={`text-[11px] leading-relaxed ${
                              isTypedHouseExisting
                                ? "text-amber-800"
                                : "text-emerald-800"
                            }`}
                          >
                            {isTypedHouseExisting
                              ? `"${inputUpper}" sudah terdaftar. User akan dipindahkan. Jika rumah sudah punya pemilik, user otomatis jadi penghuni (FAMILY). Jika belum, user jadi pemilik (OWNER).`
                              : inputUpper
                                ? `"${inputUpper}" belum terdaftar. Rumah baru akan dibuat dan user otomatis menjadi pemilik (OWNER).`
                                : "Ketik blok rumah yang benar untuk user ini."}
                          </p>
                        </div>
                      );
                    })()}

                    {houseError && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <p className="text-[12px] text-red-700">{houseError}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setModalView("main")}
                        disabled={houseSubmitting}
                        className="flex-1 rounded-xl bg-app-surface-alt py-3 text-[12px] font-semibold text-app-body transition active:scale-95 disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleHouseSubmit}
                        disabled={houseSubmitting || !houseInput.trim()}
                        className="flex-1 rounded-xl py-3 text-[12px] font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {houseSubmitting ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Menyimpan...
                          </span>
                        ) : (
                          "Simpan"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {modalView === "edit" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-extrabold text-app-title">
                        Edit Profil User
                      </h2>
                      <p className="text-[11px] text-app-body-muted">
                        {selectedUser.full_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("main")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-surface-alt active:scale-90"
                    >
                      <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                    </button>
                  </div>

                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Nomor WhatsApp
                      </label>
                      <input
                        type="text"
                        value={editWa}
                        onChange={(e) => setEditWa(e.target.value)}
                        placeholder="+62..."
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-1.5">
                        Status
                      </label>
                      <div className="flex gap-2">
                        {["ACTIVE", "SUSPENDED", "INACTIVE"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditStatus(s)}
                            className={`flex-1 rounded-xl py-2 text-[11px] font-bold transition active:scale-95 ${
                              editStatus === s
                                ? "text-white shadow-sm"
                                : "bg-app-surface-alt text-app-body-muted"
                            }`}
                            style={
                              editStatus === s
                                ? {
                                    background:
                                      s === "ACTIVE"
                                        ? "var(--color-primary)"
                                        : s === "SUSPENDED"
                                          ? "#d97706"
                                          : "#6b7280",
                                  }
                                : undefined
                            }
                          >
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editError && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <p className="text-[12px] text-red-700">{editError}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setModalView("main")}
                        disabled={editSubmitting}
                        className="flex-1 rounded-xl bg-app-surface-alt py-3 text-[12px] font-semibold text-app-body transition active:scale-95 disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting || !editName.trim()}
                        className="flex-1 rounded-xl py-3 text-[12px] font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {editSubmitting ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Menyimpan...
                          </span>
                        ) : (
                          "Simpan"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modalView === "avatar" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-extrabold text-app-title">
                        Ganti Foto Profil
                      </h2>
                      <p className="text-[11px] text-app-body-muted">
                        {selectedUser.full_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("main")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-surface-alt active:scale-90"
                    >
                      <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-app-surface-alt">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : selectedUser.profile_picture_url ? (
                        <img
                          src={selectedUser.profile_picture_url}
                          alt={selectedUser.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-14 w-14 text-app-body-muted/40" />
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-app-surface-alt px-5 py-2.5 text-[12px] font-semibold text-app-body transition hover:bg-app-primary-muted active:scale-95"
                    >
                      Pilih Foto
                    </button>

                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => setModalView("main")}
                        disabled={avatarUploading}
                        className="flex-1 rounded-xl bg-app-surface-alt py-3 text-[12px] font-semibold text-app-body transition active:scale-95 disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={!avatarFile || avatarUploading}
                        className="flex-1 rounded-xl py-3 text-[12px] font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {avatarUploading ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Mengunggah...
                          </span>
                        ) : (
                          "Upload"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {modalView === "delete" && (
                <>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
                    <TrashIcon className="h-7 w-7 text-red-600" />
                  </div>

                  <div className="text-center">
                    <h3 className="text-base font-extrabold text-app-title">
                      Hapus User?
                    </h3>
                    <p className="mt-2 text-[12px] text-app-body-muted leading-relaxed">
                      User{" "}
                      <span className="font-bold text-app-title">
                        &ldquo;{selectedUser.full_name}&rdquo;
                      </span>{" "}
                      akan dihapus secara permanen. Tindakan ini tidak dapat
                      dibatalkan.
                    </p>

                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left">
                      <p className="text-[10px] font-semibold text-amber-700 leading-relaxed">
                        Kepemilikan rumah akan dialihkan ke anggota keluarga.
                        Marketplace akan diarsipkan. Riwayat transaksi tetap
                        tersimpan.
                      </p>
                    </div>

                    <div className="mt-4 text-left">
                      <label className="block text-[11px] font-bold text-app-body-muted mb-1.5">
                        Ketik{" "}
                        <span className="text-red-600 font-mono">
                          &ldquo;{selectedUser.full_name}&rdquo;
                        </span>{" "}
                        untuk konfirmasi
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={selectedUser.full_name}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                      />
                    </div>
                  </div>

                  {deleteError && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
                      <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      <p className="text-[12px] text-red-700">{deleteError}</p>
                    </div>
                  )}

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalView("main")}
                      disabled={deleteSubmitting}
                      className="flex-1 rounded-2xl bg-app-surface-alt py-3 text-[12px] font-bold text-app-body transition active:scale-95 disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={
                        deleteSubmitting ||
                        deleteConfirmText !== selectedUser.full_name
                      }
                      className="flex-1 rounded-2xl py-3 text-[12px] font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "#dc2626" }}
                    >
                      {deleteSubmitting ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Menghapus...
                        </span>
                      ) : (
                        "Ya, Hapus"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <style>{`
            @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
            @keyframes dialogIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.92)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
          `}</style>
        </>
      )}
    </main>
  );
}
