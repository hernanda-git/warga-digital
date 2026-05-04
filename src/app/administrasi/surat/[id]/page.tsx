import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_ADMIN } from "@/lib/constants/seed-ids";
import { renderLetterTemplate, BASE_LETTER_TEMPLATE } from "@/config/letter-templates";
import { LETTER_STATUS_LABELS, LETTER_STATUS_COLORS, ROUTES, ADMINISTRASI_API_ENDPOINTS } from "@/config/administrasi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SuratDetailPage({ params }: PageProps) {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: letter } = await supabase
    .from("administrasi_letters")
    .select(`
      *,
      letter_type:administrasi_letter_types!administrasi_letters_letter_type_id_fkey(id, code, name, slug, template_html),
      user:users!administrasi_letters_user_id_fkey(id, full_name)
    `)
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .is("deleted_at", null)
    .single();

  if (!letter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500">Surat tidak ditemukan</p>
          <Link href={ROUTES.DASHBOARD} className="mt-2 block text-sm text-blue-600 hover:underline dark:text-blue-400">
            Kembali ke dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: config }, { data: tenantUser }] = await Promise.all([
    supabase
      .from("administrasi_number_configs")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single(),
    supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);

  let isAdmin = false;
  if (tenantUser) {
    const { data: adminRoles } = await supabase
      .from("tenant_user_roles")
      .select("role_id")
      .eq("tenant_user_id", tenantUser.id)
      .in("role_id", ROLE_IDS_ADMIN)
      .is("revoked_at", null)
      .limit(1);
    isAdmin = (adminRoles ?? []).length > 0;
  }

  const renderedHtml = renderLetterTemplate(
    (letter.letter_type as any)?.template_html || BASE_LETTER_TEMPLATE,
    (letter.data || {}) as Record<string, any>,
    {
      nomor_surat: letter.letter_number || "-",
      rt: config?.rt || "01",
      rw: config?.rw || "02",
      kota: config?.kota || "",
      kecamatan: config?.kecamatan || "",
      kelurahan: config?.kelurahan || "",
      provinsi: config?.provinsi || "",
      alamat_kantor: config?.alamat_kantor || "",
      nama_ketua_rt: config?.nama_ketua_rt || "",
    },
  );

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
            <h1 className="text-lg font-bold text-app-title">
              {(letter.letter_type as any)?.name || "Detail Surat"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(letter.letter_type as any)?.code}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  LETTER_STATUS_COLORS[letter.status]
                }`}
              >
                {LETTER_STATUS_LABELS[letter.status]}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-4">
        {(letter.status === "draft" || letter.status === "published") && (
          <div className="mb-4 flex gap-2">
            <Link
              href={ROUTES.CETAK(id)}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {letter.status === "draft" ? "Lihat Pratinjau" : "Cetak / Download PDF"}
            </Link>
          </div>
        )}

        {letter.status === "rejected" && letter.rejected_reason && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Ditolak: {letter.rejected_reason}
            </p>
          </div>
        )}

        {letter.notes && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Catatan: {letter.notes}
            </p>
          </div>
        )}

        {isAdmin && letter.status === "draft" && (
          <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tindakan Admin
            </h3>
            <div className="flex gap-2">
              <form
                action={`${ADMINISTRASI_API_ENDPOINTS.PUBLISH(id)}`}
                method="POST"
              >
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Terbitkan Surat
                </button>
              </form>
              <details className="group">
                <summary className="cursor-pointer rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
                  Tolak Surat
                </summary>
                <form
                  action={`${ADMINISTRASI_API_ENDPOINTS.REJECT(id)}`}
                  method="POST"
                  className="mt-2 space-y-2"
                >
                  <textarea
                    name="reason"
                    required
                    placeholder="Alasan penolakan..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  >
                    Konfirmasi Tolak
                  </button>
                </form>
              </details>
            </div>
          </div>
        )}

        <div
          className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </main>
    </div>
  );
}
