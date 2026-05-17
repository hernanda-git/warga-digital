"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@nextui-org/react";
import {
  ChevronLeftIcon,
  UserIcon,
  LockClosedIcon,
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { OtpInput } from "@/components/auth/otp-input";
import { parseBlokRumah } from "@/lib/blok-rumah";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";

/* ──────────────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────────────── */
const STEPS = [0, 1, 2] as const;
type StepIndex = (typeof STEPS)[number];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────── */
interface FamilyMemberRow {
  id: string;
  fullName: string;
  username: string;
  waNumber: string;
  email: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Shared class names
   ──────────────────────────────────────────────────────────────────────── */
const inputClassNames = {
  label: "text-app-body-muted text-[11px] font-bold uppercase tracking-widest",
  input: "text-sm font-semibold text-app-title",
  inputWrapper:
    "min-h-[52px] bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
};

/* ══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function RegisterWizardPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);

  const [step, setStep] = useState<StepIndex>(0);

  /* ── Step 0: Data Diri ─────────────────────────────────────────────── */
  const [fullName, setFullName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [houseId, setHouseId] = useState<string | null>(null);
  const [blokOwnerInfo, setBlokOwnerInfo] = useState<string | null>(null);

  /* ── Step 1: Keluarga ───────────────────────────────────────────────── */
  const [members, setMembers] = useState<FamilyMemberRow[]>([]);
  const [addFullName, setAddFullName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addWaNumber, setAddWaNumber] = useState("");
  const [addEmail, setAddEmail] = useState("");

  /* ── Step 2: PIN ────────────────────────────────────────────────────── */
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  /* ── Response state (after final submit) ────────────────────────────── */
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [blokOwnerName, setBlokOwnerName] = useState<string | null>(null);

  /* ── General UI state ───────────────────────────────────────────────── */
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    wa?: string;
    email?: string;
    username?: string;
    blok?: string;
  }>({});
  const [addFieldErrors, setAddFieldErrors] = useState<{
    name?: string;
    username?: string;
    wa?: string;
    email?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  /* ══════════════════════════════════════════════════════════════════════
     STEP 0 — Data Diri (client-side validation + check-blok only)
     ══════════════════════════════════════════════════════════════════════ */
  const clearStep0Errors = () => {
    setError("");
    setFieldErrors({});
  };

  const handleNextStep0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // ── Client-side validation ───────────────────────────────────────────
    const nameE = !fullName.trim()
      ? "Nama lengkap wajib diisi"
      : fullName.trim().length < 2
        ? "Nama minimal 2 karakter"
        : undefined;

    const hasWa = waNumber.trim().length > 0;
    const hasEmail = email.trim().length > 0;
    const hasUsername = username.trim().length > 0;

    if (!hasWa && !hasEmail && !hasUsername) {
      setFieldErrors({
        email:
          "Isi minimal satu: nomor WhatsApp, email, atau username untuk login.",
      });
      return;
    }

    let waE: string | undefined;
    if (hasWa) {
      const normalized = normalizeWaNumber(waNumber);
      waE = validateNormalizedWaNumber(normalized) ?? undefined;
    }

    let emailE: string | undefined;
    if (hasEmail) {
      emailE = EMAIL_REGEX.test(email.trim().toLowerCase())
        ? undefined
        : "Format email tidak valid";
    }

    let userE: string | undefined;
    if (hasUsername) {
      if (!USERNAME_REGEX.test(username.trim()))
        userE = "Username 3–30 karakter, huruf/angka/underscore saja";
      else userE = undefined;
    }

    const { normalized: blokNormalized, error: blokError } =
      parseBlokRumah(blokRumah);
    const blokE = blokError;

    if (nameE || waE || emailE || userE || blokE) {
      setFieldErrors({
        name: nameE,
        wa: waE,
        email: emailE,
        username: userE,
        blok: blokE,
      });
      return;
    }

    // ── Call check-blok (read-only — NO DB WRITES) ───────────────────────
    setLoading(true);
    try {
      const checkRes = await fetch("/api/auth/register/check-blok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blokRumah: blokNormalized }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error ?? "Gagal memeriksa blok");
        return;
      }

      if (!checkData.exists && !checkData.claimableExistingHouse) {
        setError(
          "Blok rumah belum terdaftar. Silakan hubungi pengurus RT untuk mendaftarkan blok ini.",
        );
        return;
      }

      // House exists — store the houseId and any owner info
      setHouseId(checkData.houseId);
      if (checkData.exists === true && checkData.ownerFullName) {
        setBlokOwnerInfo(checkData.ownerFullName);
      } else {
        setBlokOwnerInfo(null);
      }

      // Proceed to Step 1 (NO DB WRITES performed yet)
      setStep(1);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     STEP 1 — Anggota Keluarga (local state only)
     ══════════════════════════════════════════════════════════════════════ */
  const clearAddMemberErrors = () => {
    setError("");
    setAddFieldErrors({});
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAddFieldErrors({});

    const trimmedName = addFullName.trim();
    const trimmedUsername = addUsername.trim();
    const trimmedWa = addWaNumber.trim();
    const trimmedEmail = addEmail.trim();
    const normalizedWa = normalizeWaNumber(addWaNumber);

    const nameErr = !trimmedName
      ? "Nama lengkap wajib diisi"
      : trimmedName.length < 2
        ? "Nama lengkap minimal 2 karakter"
        : undefined;

    const waErr = trimmedWa
      ? (validateNormalizedWaNumber(normalizedWa) ?? undefined)
      : undefined;

    const emailErr = trimmedEmail
      ? EMAIL_REGEX.test(trimmedEmail.toLowerCase())
        ? undefined
        : "Format email tidak valid"
      : undefined;

    const userErr = !trimmedUsername
      ? "Username wajib untuk anggota" // stricter: family members need username
      : !USERNAME_REGEX.test(trimmedUsername)
        ? "Username 3–30 karakter, huruf/angka/underscore saja"
        : undefined;

    const hasAnyLogin = !!trimmedWa || !!trimmedEmail || !!trimmedUsername;
    if (!hasAnyLogin) {
      setAddFieldErrors({
        wa: "Isi minimal satu (WA/email/username)",
      });
      return;
    }

    if (nameErr || waErr || emailErr || userErr) {
      setAddFieldErrors({
        name: nameErr,
        wa: waErr,
        email: emailErr,
        username: userErr,
      });
      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`,
        fullName: trimmedName,
        username: trimmedUsername,
        waNumber: normalizedWa,
        email: trimmedEmail.toLowerCase(),
      },
    ]);
    setAddFullName("");
    setAddUsername("");
    setAddWaNumber("");
    setAddEmail("");
  };

  const handleNextStep1 = () => {
    setError("");
    setStep(2);
  };

  /* ══════════════════════════════════════════════════════════════════════
     STEP 2 — PIN + Final Submit (single API call)
     ══════════════════════════════════════════════════════════════════════ */
  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId) return;
    setError("");

    if (pin.length !== 4) {
      setError("PIN harus 4 digit");
      return;
    }
    if (confirmPin.length !== 4) {
      setError("Konfirmasi PIN harus 4 digit");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN dan konfirmasi PIN tidak sama");
      return;
    }

    setRegistering(true);
    setLoading(true);
    try {
      const { normalized: blokNormalized } = parseBlokRumah(blokRumah);

      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        blokRumah: blokNormalized,
        houseId,
        familyMembers: members.map((m) => ({
          fullName: m.fullName,
          username: m.username,
          waNumber: m.waNumber,
          email: m.email,
        })),
        pin,
        confirmPin,
      };
      if (waNumber.trim()) body.waNumber = normalizeWaNumber(waNumber);
      if (email.trim()) body.email = email.trim().toLowerCase();
      if (username.trim()) body.username = username.trim();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Gagal mendaftar";
        if (msg.includes("WhatsApp") || msg.includes("nomor"))
          setFieldErrors({ wa: msg });
        else if (msg.includes("Email") || msg.includes("email"))
          setFieldErrors({ email: msg });
        else if (msg.includes("Username") || msg.includes("username"))
          setFieldErrors({ username: msg });
        else setError(msg);
        return;
      }

      // Registration successful
      setUser({ id: data.userId, fullName: data.fullName });

      if (data.requiresApproval === true) {
        // User created but needs owner approval
        setRequiresApproval(true);
        setBlokOwnerName(data.ownerFullName ?? blokOwnerInfo);
      } else {
        // Full access granted
        setOnboardingCompleted(true);
        router.replace("/landing");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
      setRegistering(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     Navigation helpers
     ══════════════════════════════════════════════════════════════════════ */
  const goPrevious = () => {
    setError("");
    setStep((s) => (s - 1) as StepIndex);
  };

  const goToLogin = () => {
    router.replace("/auth/login");
  };

  /* ─── Derived header state ─── */
  const isApprovalScreen = step === 0 && requiresApproval;

  const STEP_META = [
    { icon: UserIcon, label: "Data Diri" },
    { icon: UserPlusIcon, label: "Keluarga" },
    { icon: LockClosedIcon, label: "PIN" },
  ];

  const headerTitle = (() => {
    if (requiresApproval) return "Menunggu Persetujuan";
    if (step === 0) return "Daftar Akun";
    if (step === 1) return "Anggota Keluarga";
    return "Atur PIN";
  })();

  const headerSubtitle = (() => {
    if (requiresApproval) return `Blok ${blokRumah}`;
    if (step === 0) return "Sawangan Regensi · RT 03";
    if (step === 1) return blokRumah ? `Blok ${blokRumah}` : "";
    return blokRumah ? `Blok ${blokRumah}` : "";
  })();

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <main className="flex h-full flex-col overflow-hidden">
      {/* ── Gradient sticky header ──────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-6 pt-5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/[0.07]"
          aria-hidden
        />

        <div className="relative z-10">
          {/* Nav row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 0) {
                  router.push("/auth/login");
                } else if (requiresApproval) {
                  goToLogin();
                } else {
                  goPrevious();
                }
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {headerSubtitle}
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                {headerTitle}
              </h1>
            </div>
          </div>

          {/* Step progress — only for normal flow */}
          {!requiresApproval && step <= 2 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {STEP_META.map(({ icon: Icon, label }, idx) => {
                const isActive = step === idx;
                const isDone = step > idx;
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 backdrop-blur-sm transition-all"
                    style={{
                      background: isActive
                        ? "rgba(255,255,255,0.25)"
                        : isDone
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.10)",
                    }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        background:
                          isActive || isDone
                            ? "rgba(255,255,255,0.30)"
                            : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {isDone ? (
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      ) : (
                        <Icon
                          className="h-4 w-4"
                          style={{
                            color: isActive ? "white" : "rgba(255,255,255,0.6)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold leading-none tracking-wide"
                      style={{
                        color: isActive
                          ? "white"
                          : isDone
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Scrollable form body ─────────────────────────────── */}
      <div className="relative -mt-4 flex flex-1 flex-col overflow-y-auto rounded-t-[2rem] bg-app-surface shadow-[0_-8px_40px_rgba(0,40,5,0.14)]">
        <div className="px-5 pt-6 pb-10 lg:mx-auto lg:w-full lg:max-w-[28rem]">
          {/* ═══ APPROVAL SCREEN ═══ */}
          {requiresApproval && (
            <div className="flex flex-col gap-5">
              {/* Status card */}
              <div
                className="flex items-start gap-3 rounded-2xl px-4 py-4"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--color-primary-muted)" }}
                >
                  <ClockIcon
                    className="h-5 w-5"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-app-title">
                    Permintaan Terkirim
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-app-body-muted">
                    Pemilik rumah{" "}
                    <strong className="font-semibold text-app-body">
                      {blokRumah}
                    </strong>{" "}
                    {blokOwnerName && (
                      <>
                        (
                        <strong className="font-semibold text-app-body">
                          {blokOwnerName}
                        </strong>
                        )
                      </>
                    )}{" "}
                    akan menerima notifikasi dan perlu menyetujui permintaan
                    Anda.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={goToLogin}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                Kembali ke Login
              </button>
            </div>
          )}

          {/* ═══ STEP 0: REGISTRATION FORM ═══ */}
          {step === 0 && !requiresApproval && (
            <form onSubmit={handleNextStep0} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Data diri Anda
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Lengkapi data untuk mendaftarkan akun dan rumah Anda.
                </p>
              </div>

              {/* Full name */}
              <Input
                label="Nama Lengkap"
                placeholder="Contoh: Budi Santoso"
                value={fullName}
                onValueChange={(v) => {
                  setFullName(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.name}
                errorMessage={fieldErrors.name}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="name"
              />

              {/* Login info banner */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <CheckCircleIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  Untuk login nanti — isi{" "}
                  <strong className="text-app-body">
                    Nomor WhatsApp, Email,
                  </strong>{" "}
                  atau <strong className="text-app-body">Username</strong>{" "}
                  (minimal salah satu).
                </p>
              </div>

              {/* WhatsApp */}
              <Input
                label="Nomor WhatsApp"
                placeholder="08xxxxxxxxxx (opsional)"
                value={waNumber}
                onValueChange={(v) => {
                  setWaNumber(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.wa}
                errorMessage={fieldErrors.wa}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="tel"
              />

              {/* Email — NEW */}
              <Input
                label="Email (opsional)"
                placeholder="Contoh: budi@email.com"
                value={email}
                onValueChange={(v) => {
                  setEmail(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.email}
                errorMessage={fieldErrors.email}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="email"
              />

              {/* Username */}
              <Input
                label="Username (opsional)"
                placeholder="Contoh: budi_santoso"
                value={username}
                onValueChange={(v) => {
                  setUsername(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.username}
                errorMessage={fieldErrors.username}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="username"
              />

              {/* House block */}
              <Input
                label="Blok Rumah"
                placeholder="Contoh: N2, J12A"
                value={blokRumah}
                onValueChange={(v) => {
                  setBlokRumah(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.blok}
                errorMessage={fieldErrors.blok}
                size="lg"
                variant="bordered"
                description="Blok + nomor rumah. Hanya blok yang sudah terdaftar oleh pengurus RT."
                classNames={inputClassNames}
                autoComplete="off"
              />

              {/* Owner info banner — shown when blok has existing owner */}
              {blokOwnerInfo && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-700">
                    Rumah ini sudah memiliki pemilik (
                    <strong>{blokOwnerInfo}</strong>). Anda akan bergabung
                    sebagai penghuni setelah disetujui.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {loading ? (
                    "Memproses..."
                  ) : (
                    <>
                      Berikutnya
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-app-body-muted">
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    className="font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Masuk
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ═══ STEP 1: FAMILY MEMBERS ═══ */}
          {step === 1 && houseId && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Tambahkan anggota keluarga
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  {blokOwnerInfo ? (
                    <>Anda akan bergabung ke rumah Blok {blokRumah}.</>
                  ) : (
                    <>Anda pemilik rumah Blok {blokRumah}.</>
                  )}{" "}
                  Tambahkan anggota keluarga sekarang atau lewati untuk
                  dilakukan nanti.
                </p>
              </div>

              {/* Member list */}
              {members.length > 0 && (
                <div
                  className="rounded-2xl border px-4 py-4"
                  style={{ borderColor: "var(--color-input-border)" }}
                >
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Anggota ditambahkan ({members.length})
                  </p>
                  <ul className="space-y-2.5">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                        style={{ background: "var(--color-surface-alt)" }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-extrabold text-white shadow-sm"
                          style={{ background: "var(--color-primary)" }}
                        >
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-app-title">
                            {m.fullName}
                          </p>
                          <p className="text-[10px] text-app-body-muted">
                            @{m.username}
                            {m.waNumber && ` · ${m.waNumber}`}
                            {m.email && ` · ${m.email}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMembers((prev) =>
                              prev.filter((x) => x.id !== m.id),
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-app-body-muted transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Hapus ${m.fullName}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add member form */}
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--color-input-border)" }}
              >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Tambah Anggota
                </p>
                <form
                  onSubmit={handleAddMember}
                  className="flex flex-col gap-4"
                >
                  <Input
                    label="Nama Lengkap"
                    placeholder="Contoh: Siti Aminah"
                    value={addFullName}
                    onValueChange={(v) => {
                      setAddFullName(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.name}
                    errorMessage={addFieldErrors.name}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="name"
                  />
                  <Input
                    label="Username"
                    placeholder="Contoh: siti_aminah"
                    value={addUsername}
                    onValueChange={(v) => {
                      setAddUsername(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.username}
                    errorMessage={addFieldErrors.username}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="username"
                    description="Wajib — digunakan untuk login anggota."
                  />
                  <Input
                    label="Nomor WhatsApp"
                    placeholder="08xxxxxxxxxx (opsional)"
                    value={addWaNumber}
                    onValueChange={(v) => {
                      setAddWaNumber(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.wa}
                    errorMessage={addFieldErrors.wa}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="tel"
                  />
                  <Input
                    label="Email (opsional)"
                    placeholder="Contoh: siti@email.com"
                    value={addEmail}
                    onValueChange={(v) => {
                      setAddEmail(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.email}
                    errorMessage={addFieldErrors.email}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="email"
                  />
                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                    style={{
                      borderColor: "var(--color-primary)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    Tambah Anggota
                  </button>
                </form>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={goPrevious}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  Berikutnya
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: SET PIN ═══ */}
          {step === 2 && houseId && (
            <form onSubmit={handleSubmitStep2} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Buat PIN
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  PIN 4 digit digunakan untuk masuk ke akun Anda. Jangan berikan
                  PIN kepada siapapun.
                </p>
              </div>

              {/* Security hint */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <LockClosedIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  PIN ini akan digunakan untuk masuk ke aplikasi. Simpan dengan
                  baik.
                </p>
              </div>

              {/* PIN */}
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  PIN (4 digit)
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

              {/* Confirm PIN */}
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Konfirmasi PIN
                </label>
                <OtpInput
                  value={confirmPin}
                  onChange={(v) => {
                    setConfirmPin(v);
                    setError("");
                  }}
                  length={4}
                  disabled={loading}
                  masked
                  autoFocus={false}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={goPrevious}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Sebelumnya
                </button>
                <button
                  type="submit"
                  disabled={
                    loading || pin.length !== 4 || confirmPin.length !== 4
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {loading ? "Mendaftarkan..." : "Simpan & Daftar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
