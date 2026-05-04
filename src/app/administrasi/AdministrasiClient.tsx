"use client";

import Link from "next/link";
import type { AdministrasiCategory, AdministrasiLetter } from "@/types/administrasi";
import { LETTER_STATUS_LABELS, LETTER_STATUS_COLORS, ROUTES } from "@/config/administrasi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface AdministrasiClientProps {
  categories: AdministrasiCategory[];
  letters: AdministrasiLetter[];
  communityName: string;
  userId: string;
}

export function AdministrasiClient({
  categories,
  letters,
  communityName,
}: AdministrasiClientProps) {
  const activeLetters = letters.filter((l) => l.status !== "rejected");
  const recentLetters = activeLetters.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/landing"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-app-title">Administrasi</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{communityName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {recentLetters.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Surat Terbaru
            </h2>
            <div className="space-y-2">
              {recentLetters.map((letter) => (
                <Link
                  key={letter.id}
                  href={ROUTES.SURAT(letter.id)}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-app-title">
                      {(letter.letter_type as any)?.name || "Surat"}
                    </p>
                    {letter.letter_number && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {letter.letter_number}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      LETTER_STATUS_COLORS[letter.status]
                    }`}
                  >
                    {LETTER_STATUS_LABELS[letter.status]}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Pilih Jenis Surat
          </h2>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id}>
                <h3 className="mb-2 text-base font-bold text-app-title">
                  {category.name}
                </h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {category.description}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {category.letter_types?.map((type) => {
                    const hasFields = true;
                    return (
                      <Link
                        key={type.id}
                        href={hasFields ? ROUTES.BARU(type.slug) : "#"}
                        className={`rounded-xl border bg-white p-3 transition-colors dark:bg-gray-800 ${
                          hasFields
                            ? "border-gray-200 hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-blue-600"
                            : "cursor-not-allowed border-gray-100 opacity-50 dark:border-gray-800"
                        }`}
                      >
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {type.code}
                        </p>
                        <p className="text-sm font-medium text-app-title">
                          {type.name}
                        </p>
                        {type.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {type.description}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="rounded-xl bg-white p-8 text-center dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">
                  Belum ada jenis surat yang tersedia.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
