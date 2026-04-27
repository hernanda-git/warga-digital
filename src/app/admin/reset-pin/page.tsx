"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
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
  full_name: string;
  username: string | null;
  wa_number: string | null;
  email: string | null;
  blok_rumah: string | null;
  status: string;
  joined_at: string | null;
}

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  return email.replace(/^(.)(.*?)@(.*)$/, "$1***@$3");
}

function maskWA(wa: string | null): string {
  if (!wa) return "—";
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 8) return wa;
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

export default function AdminResetPinPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/reset-pin");
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
            router.replace("/auth/login?redirect=/admin/reset-pin");
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
      const res = await apiFetch("/api/admin/warga?limit=500");
      const body = (await res.json().catch(() => ({}))) as {
        warga?: UserItem[];
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat daftar user");
        return;
      }
      setUsers(body.warga ?? []);
    } catch {
      setError("Gagal memuat daftar user. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadUsers();
    }
  }, [checkingAccess, isAuthenticated, loadUsers]);

  const handleResetPin = useCallback(
    async (userId: string) => {
      setActingUserId(userId);
      setActionError(null);
      setSuccessMessage(null);

      try {
        const res = await apiFetch("/api/admin/users/send-reset-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          setActionError(body.error ?? "Gagal mengirim email reset PIN");
          return;
        }

        setSuccessMessage(body.message ?? "Email reset PIN telah dikirim");
        setConfirmUserId(null);

        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } catch {
        setActionError("Gagal mengirim email reset PIN. Coba lagi.");
      } finally {
        setActingUserId(null);
      }
    },
    [],
  );

  const filteredUsers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;

    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.wa_number && u.wa_number.includes(q)) ||
        (u.blok_rumah && u.blok_rumah.toLowerCase().includes(q)),
    );
  }, [users, query]);

  const pendingCount = useMemo(() => users.length, [users]);

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat halaman reset PIN..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-input-border)] bg-app-surface/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-95"
            aria-label="Kembali ke admin"
          >
            <ChevronLeftIcon className="h-4 w-4 text-app-body-muted" />
          </button>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight text-app-title">
              Reset PIN User
            </h1>
            <p className="text-[10px] text-app-body-muted">
              {pendingCount} user terdaftar
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadUsers(true)}
          disabled={refreshing || loading}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-95 disabled:opacity-40"
          aria-label="Muat ulang"
        >
          <ArrowPathIcon
            className={`h-4 w-4 text-app-body-muted ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      {(actionError || successMessage) && (
        <div className="shrink-0 px-4 pt-3">
          {actionError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <ExclamationCircleIcon className="h-4 w-4" />
              <span>{actionError}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[12px] text-green-700">
              <CheckCircleIcon className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className="shrink-0 border-b border-[var(--color-input-border)] bg-app-surface px-4 py-3">
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

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-app-primary-muted" />
            <p className="mt-3 text-[12px] text-app-body-muted">
              Memuat daftar user...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationCircleIcon className="h-8 w-8 text-red-400" />
            <p className="mt-3 text-[12px] text-red-600">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[12px] text-app-body-muted">
              {query ? "Tidak ada user yang cocok" : "Tidak ada user"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredUsers.map((user) => {
              const isActing = actingUserId === user.user_id;
              const showConfirm = confirmUserId === user.user_id;
              const hasEmail = !!user.email;
              const isActive = user.status === "ACTIVE";

              return (
                <div
                  key={user.user_id}
                  className="rounded-2xl bg-app-surface p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-app-title">
                          {user.full_name}
                        </p>
                        {!isActive && (
                          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-app-body-muted">
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-3 w-3" />
                          {maskEmail(user.email)}
                        </span>
                        <span className="flex items-center gap-1">
                          {user.username ? (
                            <>@{user.username}</>
                          ) : (
                            <>
                              <MagnifyingGlassIcon className="h-3 w-3" />
                              No username
                            </>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          {maskWA(user.wa_number)}
                        </span>
                        <span>{user.blok_rumah || "No blok"}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-app-body-muted/70">
                        Bergabung: {formatJoinedDate(user.joined_at)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {showConfirm ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResetPin(user.user_id)}
                            disabled={isActing || !hasEmail || !isActive}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActing ? "Mengirim..." : "Kirim"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUserId(null)}
                            disabled={isActing}
                            className="rounded-lg bg-app-surface-alt px-3 py-1.5 text-[11px] font-medium text-app-body-muted transition hover:bg-app-primary-muted active:scale-95 disabled:opacity-50"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmUserId(user.user_id)}
                          disabled={!hasEmail || !isActive}
                          title={
                            !hasEmail
                              ? "User belum memiliki email"
                              : !isActive
                                ? "Akun user tidak aktif"
                                : "Reset PIN user ini"
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-primary-muted transition hover:bg-app-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <EnvelopeIcon className="h-4 w-4 text-app-primary" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
