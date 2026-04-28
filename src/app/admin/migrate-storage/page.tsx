"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon, CloudArrowDownIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
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

interface ScanBucket {
  bucket: string;
  total: number;
  needsMigration: number;
}

interface ScanResponse {
  buckets: ScanBucket[];
}

interface MigrationItem {
  id: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
}

interface MigrationResult {
  bucket: string;
  completed: number;
  skipped: number;
  failed: number;
  items: MigrationItem[];
}

interface MigrationResponse {
  result: MigrationResult;
}

const BUCKET_LABELS: Record<string, string> = {
  avatars: "Foto Profil (Avatars)",
  "jasa-images": "Gambar Jasa",
  "kas-rt-attachments": "Lampiran Kas RT",
  "related-data": "Referensi URL di Database",
};

const BUCKET_DESCRIPTIONS: Record<string, string> = {
  avatars: "File foto profil pengguna dan anggota organisasi",
  "jasa-images": "Gambar layanan jasa warga",
  "kas-rt-attachments": "Lampiran bukti transaksi Kas RT (private, signed URL)",
  "related-data": "Perbarui referensi URL Supabase di tabel organisation_members, organisation_member_customs, dan articles (file sudah di R2)",
};

export default function AdminMigrateStoragePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [scanResults, setScanResults] = useState<ScanBucket[]>([]);
  const [scanning, setScanning] = useState(true);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    loadScan();
  }

  async function loadScan() {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/migrate-storage");
      if (!res.ok) throw new Error("Gagal memindai");
      const data: ScanResponse = await res.json();
      setScanResults(data.buckets);
    } catch {
      setError("Gagal memindai status migrasi.");
    } finally {
      setScanning(false);
    }
  }

  const startMigration = useCallback(async (bucket: string) => {
    setActiveBucket(bucket);
    setMigrating(true);
    setMigrationResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/migrate-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
      });

      if (!res.ok) throw new Error("Gagal menjalankan migrasi");

      const data: MigrationResponse = await res.json();
      setMigrationResult(data.result);
    } catch {
      setError("Gagal menjalankan migrasi.");
    } finally {
      setMigrating(false);
      loadScan();
    }
  }, []);

  if (!hasMounted || checkingAccess) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Migrasi Penyimpanan ke R2
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Salin file dari Supabase Storage ke Cloudflare R2 dan perbarui referensi di database.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {scanning ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Memindai database...
        </div>
      ) : (
        <div className="space-y-4">
          {scanResults.map((bucket) => {
            const label = BUCKET_LABELS[bucket.bucket] ?? bucket.bucket;
            const desc = BUCKET_DESCRIPTIONS[bucket.bucket] ?? "";
            const isActive = activeBucket === bucket.bucket;
            const done = bucket.total > 0 && bucket.needsMigration === 0;
            const isMigratingThis = migrating && isActive;

            return (
              <div
                key={bucket.bucket}
                className={`rounded-xl border p-4 transition-colors ${
                  done
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {label}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {desc}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Total: <strong>{bucket.total}</strong>
                      </span>
                      {bucket.needsMigration > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          Perlu migrasi: <strong>{bucket.needsMigration}</strong>
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          <CheckCircleIcon className="mr-0.5 inline h-3.5 w-3.5" />
                          Sudah termigrasi
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => startMigration(bucket.bucket)}
                    disabled={isMigratingThis || done || bucket.total === 0}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      done || bucket.total === 0
                        ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                        : isMigratingThis
                          ? "cursor-wait bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    {isMigratingThis ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CloudArrowDownIcon className="h-4 w-4" />
                        {done ? "Selesai" : "Migrasi"}
                      </>
                    )}
                  </button>
                </div>

                {isMigratingThis && migrationResult && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        {migrationResult.completed} berhasil
                      </span>
                      {migrationResult.skipped > 0 && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          {migrationResult.skipped} dilewati
                        </span>
                      )}
                      {migrationResult.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircleIcon className="h-3.5 w-3.5" />
                          {migrationResult.failed} gagal
                        </span>
                      )}
                    </div>

                    {migrationResult.items.filter((i) => i.status === "error" && i.detail).length > 0 && (
                      <details className="text-xs text-red-600 dark:text-red-400">
                        <summary className="cursor-pointer font-medium">
                          Detail error ({migrationResult.items.filter((i) => i.status === "error").length})
                        </summary>
                        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded bg-red-50 p-2 dark:bg-red-900/20">
                          {migrationResult.items
                            .filter((i) => i.status === "error")
                            .map((i) => (
                              <li key={i.id}>
                                <strong>{i.id.slice(0, 8)}:</strong> {i.detail}
                              </li>
                            ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 text-center">
            <button
              onClick={loadScan}
              disabled={scanning || migrating}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ArrowPathIcon className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
