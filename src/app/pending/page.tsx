"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  ClockIcon,
  NewspaperIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

type RoomState = "loading" | "pending" | "rejected";

interface StatusDetail {
  approvalCase: "FIRST_OCCUPANT" | "JOIN";
  blokRumah: string | null;
  requestedAt: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  const [state, setState] = useState<RoomState>("loading");
  const [detail, setDetail] = useState<StatusDetail | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status", { cache: "no-store" });
      if (res.status === 401) {
        clearUser();
        router.replace("/auth/login?redirect=/pending");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
        approvalCase?: "FIRST_OCCUPANT" | "JOIN";
        blokRumah?: string | null;
        requestedAt?: string | null;
      };
      if (body.status === "approved") {
        // Cookie already rotated server-side — enter the app.
        router.replace("/landing");
        return;
      }
      if (body.status === "rejected") {
        clearUser();
        setState("rejected");
        return;
      }
      setDetail({
        approvalCase: body.approvalCase ?? "JOIN",
        blokRumah: body.blokRumah ?? null,
        requestedAt: body.requestedAt ?? null,
      });
      setState("pending");
    } catch {
      // Network hiccup: stay on current state, next poll retries.
      setState((s) => (s === "loading" ? "pending" : s));
    }
  }, [clearUser, router]);

  useEffect(() => {
    void checkStatus();
    const timer = setInterval(() => void checkStatus(), 10_000);
    return () => clearInterval(timer);
  }, [checkStatus]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie cleanup is best-effort; still leave the room.
    } finally {
      clearUser();
      router.replace("/auth/login");
    }
  }, [clearUser, router]);

  if (state === "loading") {
    return <PageLoader message="Memeriksa status pendaftaran..." />;
  }

  if (state === "rejected") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-app-surface-alt px-6 py-10">
        <div className="w-full max-w-sm rounded-3xl border border-[var(--color-input-border)] bg-app-surface p-6 text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-3 text-base font-bold text-app-title">Pendaftaran Ditolak</h1>
          <p className="mt-2 text-xs text-app-body-muted">
            Maaf, permintaan pendaftaran Anda tidak disetujui. Hubungi pengurus RT
            untuk informasi lebih lanjut, atau masuk dengan akun lain.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            {loggingOut ? "Keluar..." : "Kembali ke Login"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-app-surface-alt px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--color-input-border)] bg-app-surface p-6 text-center">
        <ClockIcon className="mx-auto h-12 w-12 text-app-primary" />
        <h1 className="mt-3 text-base font-bold text-app-title">Menunggu Persetujuan</h1>
        <p className="mt-2 text-xs text-app-body-muted">
          {detail?.approvalCase === "FIRST_OCCUPANT"
            ? "Anda mendaftar sebagai penghuni pertama. Permintaan menunggu persetujuan admin."
            : "Permintaan Anda menunggu persetujuan kepala keluarga atau admin."}
        </p>
        <dl className="mt-4 space-y-1.5 rounded-2xl bg-app-surface-alt px-4 py-3 text-left text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-app-body-muted">Blok rumah</dt>
            <dd className="font-semibold text-app-title">
              {detail?.blokRumah ? `Blok ${detail.blokRumah}` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-app-body-muted">Diajukan</dt>
            <dd className="font-semibold text-app-title">
              {formatDateTime(detail?.requestedAt ?? null)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-app-body-muted">Status</dt>
            <dd className="inline-flex items-center gap-1 font-semibold text-amber-600">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Menunggu
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-app-body-muted">
          Halaman ini memeriksa status otomatis. Anda akan masuk sendiri setelah disetujui.
        </p>
        <Link
          href="/artikel"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-input-border)] bg-app-surface-alt px-4 py-2.5 text-sm font-semibold text-app-title transition active:scale-95"
        >
          <NewspaperIcon className="h-4 w-4" />
          Baca Berita Sambil Menunggu
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-app-body-muted transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </main>
  );
}
