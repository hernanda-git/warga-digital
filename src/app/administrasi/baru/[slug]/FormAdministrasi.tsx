"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { ROUTES, ADMINISTRASI_API_ENDPOINTS } from "@/config/administrasi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface LetterTypeDetail {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  fields: Array<{
    id: string;
    field_key: string;
    field_label: string;
    field_type: string;
    field_options: Array<{ label: string; value: string }> | null;
    placeholder: string | null;
    is_required: boolean;
    sort_order: number;
  }>;
}

interface FormAdministrasiProps {
  slug: string;
  userId: string;
}

export function FormAdministrasi({ slug }: FormAdministrasiProps) {
  const router = useRouter();
  const [letterType, setLetterType] = useState<LetterTypeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(ADMINISTRASI_API_ENDPOINTS.LETTER_TYPE(slug), {
          method: "GET",
        });
        if (!res.ok) {
          setError("Jenis surat tidak ditemukan");
          return;
        }
        const json = await res.json();
        setLetterType(json.data);
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleChange = useCallback(
    (key: string, value: string) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!letterType) return;

      const missing = letterType.fields
        .filter((f) => f.is_required && !formData[f.field_key]?.trim())
        .map((f) => f.field_label);

      if (missing.length > 0) {
        setError(`Harap isi: ${missing.join(", ")}`);
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const res = await apiFetch(ADMINISTRASI_API_ENDPOINTS.LETTERS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            letter_type_slug: slug,
            data: formData,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Gagal menyimpan surat");
          return;
        }

        const json = await res.json();
        router.push(ROUTES.SURAT(json.data.id));
      } catch {
        setError("Gagal menyimpan surat");
      } finally {
        setSubmitting(false);
      }
    },
    [letterType, formData, slug, router],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  if (error && !letterType) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900">
        <div className="mx-auto max-w-2xl">
          <Link
            href={ROUTES.DASHBOARD}
            className="mb-4 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Kembali
          </Link>
          <div className="rounded-xl bg-white p-8 text-center dark:bg-gray-800">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!letterType) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href={ROUTES.DASHBOARD}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-app-title">Buat Surat Baru</h1>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {letterType.code}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-app-title">{letterType.name}</h2>
          {letterType.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {letterType.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {letterType.fields.map((field) => (
            <div key={field.field_key}>
              <label className="mb-1 block text-sm font-medium text-app-title">
                {field.field_label}
                {field.is_required && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>
              {field.field_type === "textarea" ? (
                <textarea
                  value={formData[field.field_key] || ""}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                  placeholder={field.placeholder || ""}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
                />
              ) : field.field_type === "select" ? (
                <select
                  value={formData[field.field_key] || ""}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
                >
                  <option value="">Pilih...</option>
                  {(field.field_options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : "text"}
                  value={formData[field.field_key] || ""}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href={ROUTES.DASHBOARD}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {submitting ? "Menyimpan..." : "Ajukan Surat"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
