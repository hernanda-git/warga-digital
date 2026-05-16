"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  KeyIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { OtpInput } from "@/components/auth/otp-input";

function ResetPinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("user");

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [validateError, setValidateError] = useState("");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token || !userId) {
      setValidateError(
        "Tautan tidak valid. Pastikan Anda menggunakan tautan dari email.",
      );
      setValidating(false);
      return;
    }

    fetch(
      `/api/auth/reset-pin/validate?token=${encodeURIComponent(token)}&user=${encodeURIComponent(userId)}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setValidateError(
            data.error ?? "Tautan tidak valid atau sudah kadaluarsa.",
          );
          setValid(false);
        } else {
          setValid(true);
        }
      })
      .catch(() => {
        setValidateError("Terjadi kesalahan saat memeriksa tautan. Coba lagi.");
        setValid(false);
      })
      .finally(() => setValidating(false));
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN harus 4 digit.");
      return;
    }
    if (confirmPin.length !== 4) {
      setError("Konfirmasi PIN harus 4 digit.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN dan konfirmasi PIN tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId, pin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah PIN. Coba lagi.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-6 pb-10 lg:mx-auto lg:w-full lg:max-w-[28rem]">
      {validating ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[var(--color-primary)]" />
          <p className="text-sm text-app-body-muted">Memeriksa tautan...</p>
        </div>
      ) : !valid ? (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-app-title">
              Tautan Tidak Valid
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-app-body-muted">
              {validateError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/auth/forgot-pin")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
            }}
          >
            Minta Tautan Baru
          </button>
          <p className="text-center text-sm text-app-body-muted">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-primary)" }}
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Kembali ke Login
            </Link>
          </p>
        </div>
      ) : success ? (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-app-title">
              PIN Berhasil Diubah
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-app-body-muted">
              PIN Anda telah diperbarui. Silakan masuk menggunakan PIN baru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
            }}
          >
            Masuk Sekarang
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-extrabold text-app-title">
              Buat PIN Baru
            </h2>
            <p className="mt-1 text-sm text-app-body-muted">
              Masukkan PIN 4 digit baru dan konfirmasi untuk menyelesaikan
              proses reset.
            </p>
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
              PIN Baru (4 digit)
            </label>
            <OtpInput
              value={pin}
              onChange={(v) => {
                setPin(v);
                setError("");
              }}
              length={4}
              disabled={loading}
              error={error}
              masked
            />
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
              Konfirmasi PIN (4 digit)
            </label>
            <OtpInput
              value={confirmPin}
              onChange={(v) => {
                setConfirmPin(v);
                setError("");
              }}
              length={4}
              disabled={loading}
              error={error}
              masked
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
            }}
          >
            {loading ? (
              "Menyimpan..."
            ) : (
              <>
                Simpan PIN Baru
                <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-app-body-muted">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-primary)" }}
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Kembali ke Login
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

function ResetPinFallback() {
  return (
    <div className="px-5 pt-6 pb-10 lg:mx-auto lg:w-full lg:max-w-[28rem]">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[var(--color-primary)]" />
        <p className="text-sm text-app-body-muted">Memuat...</p>
      </div>
    </div>
  );
}

export default function ResetPinPage() {
  return (
    <main className="flex h-full flex-col overflow-hidden">
      {/* ── Gradient hero ─────────────────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-5 pb-14 pt-8"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-16 right-10 h-20 w-20 rounded-full bg-white/[0.06]"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/25 shadow-xl backdrop-blur-sm">
            <KeyIcon className="h-9 w-9 text-white" />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <ShieldCheckIcon className="h-3 w-3 text-white/80" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Sawangan Regensi · RT 03
              </span>
            </div>
            <h1 className="text-[24px] font-extrabold leading-tight text-white">
              Warga Digital
            </h1>
            <p className="mt-1 text-sm text-white/70">Atur Ulang PIN</p>
          </div>
        </div>
      </section>

      {/* ── Form card ─────────────────────────────────────────── */}
      <div className="relative -mt-6 flex flex-1 flex-col overflow-y-auto rounded-t-[2rem] bg-app-surface shadow-[0_-8px_40px_rgba(0,40,5,0.16)]">
        <Suspense fallback={<ResetPinFallback />}>
          <ResetPinForm />
        </Suspense>
      </div>
    </main>
  );
}
