"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";

export default function ForgotPinPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = login.trim();
    if (!trimmed) {
      setError("Isi Username atau Nomor WhatsApp untuk melanjutkan.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setSent(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

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
            <p className="mt-1 text-sm text-white/70">Lupa PIN</p>
          </div>
        </div>
      </section>

      {/* ── Form card ─────────────────────────────────────────── */}
      <div className="relative -mt-6 flex flex-1 flex-col overflow-y-auto rounded-t-[2rem] bg-app-surface shadow-[0_-8px_40px_rgba(0,40,5,0.16)]">
        <div className="px-5 pt-6 pb-10">
          {sent ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-primary-muted)" }}
              >
                <EnvelopeIcon
                  className="h-8 w-8"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Email Terkirim
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-app-body-muted">
                  Jika akun ditemukan dan memiliki email terdaftar, kami telah
                  mengirimkan tautan reset PIN. Periksa kotak masuk dan folder
                  spam Anda.
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
                Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Lupa PIN?
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Masukkan Username atau Nomor WhatsApp Anda. Kami akan mengirim
                  tautan reset PIN ke email terdaftar.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Username atau Nomor WhatsApp
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    setError("");
                  }}
                  placeholder="Contoh: budi_santoso atau 08123456789"
                  className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-app-title placeholder:font-normal placeholder:text-app-body-muted/50 focus:outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-input-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  autoComplete="username"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!login.trim() || loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {loading ? (
                  "Mengirim..."
                ) : (
                  <>
                    Kirim Tautan Reset
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
      </div>
    </main>
  );
}
