"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  TableCellsIcon,
  PlayIcon,
  StopIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface ConnectionResult {
  ok: boolean;
  version?: string;
  projectRef?: string;
  latencyMs?: number;
  dbUrl?: string;
  error?: string;
  hint?: string;
}

interface ValidationResult {
  tables: string[];
  extensions: string[];
  tableCount: number;
  isEmpty: boolean;
  warnings: string[];
}

interface SSEMessage {
  type:
    | "phase-start"
    | "phase-end"
    | "step-start"
    | "step-end"
    | "step-progress"
    | "step-error"
    | "complete";
  phase?: number;
  label?: string;
  step?: string;
  status?: string;
  error?: string;
  index?: number;
  total?: number;
  statement?: string;
  tableCounts?: Record<string, number>;
}

interface StepState {
  id: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

interface PhaseState {
  id: number;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  steps: StepState[];
}

interface LogEntry {
  phase: number;
  step: string;
  message: string;
  type: "info" | "success" | "error";
}

const PHASES_META: { id: number; label: string; description: string }[] = [
  { id: 1, label: "Ekstensi", description: "pgcrypto, pg_cron" },
  { id: 2, label: "Enum Types", description: "Tipe data tetap" },
  {
    id: 3,
    label: "Tabel Inti",
    description: "users, tenants, communities, houses, dll",
  },
  {
    id: 4,
    label: "Tabel Fitur",
    description: "Marketplace, kas RT, notifikasi, organisasi, badges",
  },
  {
    id: 5,
    label: "Tabel Tambahan",
    description: "Jasa, jualan, artikel, audit log",
  },
  {
    id: 6,
    label: "Fungsi & Trigger",
    description: "Fungsi PostgreSQL dan trigger",
  },
  { id: 7, label: "Index", description: "Index optimasi query" },
  {
    id: 8,
    label: "RLS & Kebijakan",
    description: "Row Level Security dan policies",
  },
  {
    id: 9,
    label: "Data Awal (Seed)",
    description: "Data awal tenant, roles, marketplace",
  },
  { id: 10, label: "Verifikasi", description: "Hitung baris per tabel" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminMigrateDatabasePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Connection form
  const [targetUrl, setTargetUrl] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [targetConnectionString, setTargetConnectionString] = useState("");
  const [connectionResult, setConnectionResult] =
    useState<ConnectionResult | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);

  // Validation
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Migration
  const [phases, setPhases] = useState<PhaseState[]>(() =>
    PHASES_META.map((p) => ({
      ...p,
      status: "pending" as const,
      steps: [],
    })),
  );
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number> | null>(
    null,
  );

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !isAuthenticated) return;
    checkAccess();
  }, [hasMounted, isAuthenticated]);

  async function checkAccess() {
    try {
      const res = await apiFetch("/api/profile");
      if (!res.ok) throw new Error("Unauthorized");
      const body = await res.json();
      const data: ProfileData | undefined = body?.data ?? body;
      if (!data || !hasAdminRoleInProfile(data)) {
        router.replace("/admin");
        return;
      }
    } catch {
      clearUser();
      router.replace("/auth/login");
      return;
    }
    setCheckingAccess(false);
    loadConfig();
  }

  async function loadConfig() {
    try {
      const res = await apiFetch("/api/admin/migrate-database");
      if (!res.ok) return;
      const data = await res.json();
      if (data.targetUrl) setTargetUrl(data.targetUrl);
      if (data.targetKey) setTargetKey(data.targetKey);
      if (data.targetConnectionString)
        setTargetConnectionString(data.targetConnectionString);
    } catch {}
  }

  // ── Connection ──────────────────────────────────────────────────────────

  const handleCheckConnection = useCallback(async () => {
    setCheckingConnection(true);
    setConnectionResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/migrate-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-connection",
          targetUrl,
          targetKey,
          targetConnectionString,
        }),
      });
      const data = await res.json();
      setConnectionResult(data as ConnectionResult);
    } catch {
      setConnectionResult({ ok: false, error: "Gagal menghubungi server" });
    } finally {
      setCheckingConnection(false);
    }
  }, [targetUrl, targetKey, targetConnectionString]);

  // ── Validation ──────────────────────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setValidationResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/migrate-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate",
          targetUrl,
          targetKey,
          targetConnectionString,
        }),
      });
      const data = await res.json();
      setValidationResult(data as ValidationResult);
    } catch {
      setError("Gagal memvalidasi server target");
    } finally {
      setValidating(false);
    }
  }, [targetUrl, targetKey, targetConnectionString]);

  // ── Migration ───────────────────────────────────────────────────────────

  const handleStartMigration = useCallback(() => {
    setMigrating(true);
    setMigrationComplete(false);
    setTableCounts(null);
    setLogs([]);
    setPhases(
      PHASES_META.map((p) => ({
        ...p,
        status: "pending" as const,
        steps: [],
      })),
    );

    const controller = new AbortController();
    abortRef.current = controller;
    void runMigration(controller.signal);
  }, [targetUrl, targetKey, targetConnectionString]);

  const runMigration = async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/migrate-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "migrate",
          targetUrl,
          targetKey,
          targetConnectionString,
        }),
        signal,
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Migration failed" }));
        setError(err.error ?? "Migrasi gagal");
        setMigrating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Tidak bisa membaca stream response");
        setMigrating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const msg = JSON.parse(line.slice(6)) as SSEMessage;
            handleSSEMessage(msg);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err?.message ?? "Migrasi gagal");
      }
    } finally {
      setMigrating(false);
      setMigrationComplete(true);
    }
  };

  const handleSSEMessage = (msg: SSEMessage) => {
    setPhases((prev) => {
      const next = [...prev];

      if (msg.type === "phase-start" && msg.phase) {
        const idx = next.findIndex((p) => p.id === msg.phase);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            status: "running",
            steps: [],
          };
        }
        setExpandedPhases((s) => new Set(s).add(msg.phase!));
      }

      if (msg.type === "phase-end" && msg.phase) {
        const idx = next.findIndex((p) => p.id === msg.phase);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            status: msg.status === "done" ? "done" : "error",
          };
        }

        if (msg.tableCounts) {
          setTableCounts(msg.tableCounts);
        }
      }

      if (msg.type === "step-start" && msg.phase && msg.step) {
        const idx = next.findIndex((p) => p.id === msg.phase);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            steps: [...next[idx].steps, { id: msg.step, status: "running" }],
          };
        }
        addLog(msg.phase, msg.step, `Memulai: ${msg.step}`, "info");
      }

      if (msg.type === "step-end" && msg.phase && msg.step) {
        const idx = next.findIndex((p) => p.id === msg.phase);
        if (idx >= 0) {
          const steps = [...next[idx].steps];
          const sIdx = steps.findIndex((s) => s.id === msg.step);
          if (sIdx >= 0) {
            steps[sIdx] = {
              ...steps[sIdx],
              status: msg.status === "done" ? "done" : "error",
              error: msg.error,
            };
          }
          next[idx] = { ...next[idx], steps };
        }
        const status = msg.status === "done" ? "success" : "error";
        addLog(
          msg.phase,
          msg.step,
          `${msg.step}: ${msg.status === "done" ? "Berhasil" : "Gagal"}`,
          status,
        );
      }

      if (msg.type === "step-error" && msg.phase && msg.step) {
        addLog(
          msg.phase,
          msg.step,
          `Error: ${msg.error ?? "Unknown"} (${msg.statement ?? ""})`,
          "error",
        );
      }

      return next;
    });
  };

  const addLog = (
    phase: number | undefined,
    step: string | undefined,
    message: string,
    type: LogEntry["type"],
  ) => {
    setLogs((prev) => [
      ...prev,
      { phase: phase ?? 0, step: step ?? "", message, type },
    ]);
  };

  const handleCancelMigration = useCallback(() => {
    abortRef.current?.abort();
    setMigrating(false);
  }, []);

  const togglePhase = (id: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────

  if (!hasMounted || checkingAccess) {
    return <PageLoader />;
  }

  const connectionOk = connectionResult?.ok === true;
  const canValidate = connectionOk;
  const canMigrate =
    connectionOk && (validationResult?.isEmpty ?? false) && !migrating;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Migrasi Database
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Salin skema dan data dari server Supabase saat ini ke server Supabase
          baru.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Connection ─────────────────────────────────────────────── */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <ServerIcon className="h-4 w-4" />
          Koneksi Server Target
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              URL Supabase Target
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://xxxxxxx.supabase.co"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Service Role Key
            </label>
            <input
              type="password"
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              placeholder="eyJ..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Connection String Database
            </label>
            <input
              type="password"
              value={targetConnectionString}
              onChange={(e) => setTargetConnectionString(e.target.value)}
              placeholder="postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <button
            onClick={handleCheckConnection}
            disabled={
              checkingConnection ||
              !targetUrl ||
              !targetKey ||
              !targetConnectionString
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            {checkingConnection ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Mengecek...
              </>
            ) : (
              <>
                <BeakerIcon className="h-4 w-4" />
                Uji Koneksi
              </>
            )}
          </button>

          {connectionResult && (
            <div
              className={`mt-2 rounded-lg p-3 text-sm ${
                connectionOk
                  ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {connectionOk ? (
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Terhubung</p>
                    <p className="text-xs opacity-80">
                      {connectionResult.projectRef} ·{" "}
                      {connectionResult.version?.split(",")[0]} ·{" "}
                      {connectionResult.latencyMs}ms
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Gagal terhubung</p>
                    <p className="text-xs opacity-80">
                      {connectionResult.error}
                    </p>
                    {connectionResult.hint && (
                      <p className="mt-2 rounded bg-red-100/50 p-2 text-[11px] leading-relaxed dark:bg-red-900/30">
                        {connectionResult.hint}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Validation ──────────────────────────────────────────────── */}
      {canValidate && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <TableCellsIcon className="h-4 w-4" />
            Validasi Server Target
          </h2>

          <button
            onClick={handleValidate}
            disabled={validating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            {validating ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Memvalidasi...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-4 w-4" />
                Validasi Server Target
              </>
            )}
          </button>

          {validationResult && (
            <div className="mt-3 space-y-2">
              {validationResult.isEmpty ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  Database kosong — siap untuk migrasi
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Database tidak kosong ({validationResult.tableCount} tabel
                      ditemukan)
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      Tabel: {validationResult.tables.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {validationResult.extensions.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Ekstensi terpasang: {validationResult.extensions.join(", ")}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Migration Progress ──────────────────────────────────────── */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <PlayIcon className="h-4 w-4" />
          Progress Migrasi
        </h2>

        {/* Phase cards */}
        <div className="space-y-2">
          {phases.map((phase) => {
            const phaseSteps = phase.steps;
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <div
                key={phase.id}
                className={`rounded-lg border p-3 transition-colors ${
                  phase.status === "done"
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                    : phase.status === "error"
                      ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
                      : phase.status === "running"
                        ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600"
                }`}
              >
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none ${
                      phase.status === "done"
                        ? "bg-green-500 text-white"
                        : phase.status === "error"
                          ? "bg-red-500 text-white"
                          : phase.status === "running"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {phase.status === "done" ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : phase.status === "error" ? (
                      <XCircleIcon className="h-3.5 w-3.5" />
                    ) : (
                      phase.id
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Phase {phase.id}: {phase.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {phase.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {phase.status === "running" && (
                      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    )}
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        phase.status === "pending"
                          ? "text-gray-400"
                          : phase.status === "running"
                            ? "text-blue-500"
                            : phase.status === "done"
                              ? "text-green-500"
                              : "text-red-500"
                      }`}
                    >
                      {phase.status === "pending"
                        ? "Menunggu"
                        : phase.status === "running"
                          ? "Berjalan"
                          : phase.status === "done"
                            ? "Selesai"
                            : "Gagal"}
                    </span>
                    {phaseSteps.length > 0 && (
                      <button className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </button>

                {/* Steps */}
                {isExpanded && phaseSteps.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 dark:border-gray-600">
                    {phaseSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 pl-9"
                      >
                        {step.status === "done" ? (
                          <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                        ) : step.status === "error" ? (
                          <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
                        ) : step.status === "running" ? (
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-500" />
                        )}
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {step.id}
                        </span>
                        {step.error && (
                          <span
                            className="text-[10px] text-red-500 truncate"
                            title={step.error}
                          >
                            — {step.error.slice(0, 80)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Control buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {!migrating && !migrationComplete && (
            <button
              onClick={handleStartMigration}
              disabled={!canMigrate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
            >
              <PlayIcon className="h-4 w-4" />
              Mulai Migrasi
            </button>
          )}

          {migrating && (
            <button
              onClick={handleCancelMigration}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800"
            >
              <StopIcon className="h-4 w-4" />
              Batalkan
            </button>
          )}

          {migrationComplete && (
            <button
              onClick={() => {
                setMigrationComplete(false);
                setPhases(
                  PHASES_META.map((p) => ({
                    ...p,
                    status: "pending" as const,
                    steps: [],
                  })),
                );
                setLogs([]);
                setTableCounts(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Mulai Ulang
            </button>
          )}
        </div>
      </section>

      {/* ── Live Log ────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-gray-950 p-4 dark:border-gray-700">
          <h2 className="mb-2 text-sm font-semibold text-gray-300">
            Log Langsung
          </h2>
          <div
            ref={logRef}
            className="max-h-64 overflow-y-auto space-y-0.5 font-mono text-[11px] leading-relaxed"
          >
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                      ? "text-green-400"
                      : "text-gray-400"
                }`}
              >
                <span className="opacity-50">
                  [{log.phase}.{log.step}]
                </span>{" "}
                {log.message}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {tableCounts && (
        <section className="mb-6 rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-300">
            <CheckCircleIcon className="h-5 w-5" />
            Migrasi Selesai
          </h2>

          <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
            {Object.entries(tableCounts).map(([name, count]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded bg-white/60 px-2 py-1.5 dark:bg-gray-800/60"
              >
                <span className="text-gray-600 dark:text-gray-400 truncate mr-2">
                  {name}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                  {count < 0 ? "?" : count}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-green-600 dark:text-green-400">
            {Object.values(tableCounts).filter((c) => c >= 0).length} tabel
            terverifikasi
          </p>
        </section>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400">
        Warga Digital · Migrasi Database
      </p>
    </div>
  );
}
