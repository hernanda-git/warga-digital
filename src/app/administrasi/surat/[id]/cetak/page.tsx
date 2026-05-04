import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { renderLetterTemplate, BASE_LETTER_TEMPLATE } from "@/config/letter-templates";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CetakSuratPage({ params }: PageProps) {
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
      letter_type:administrasi_letter_types(id, code, name, slug, template_html)
    `)
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .is("deleted_at", null)
    .single();

  if (!letter) {
    redirect("/administrasi");
  }

  const { data: config } = await supabase
    .from("administrasi_number_configs")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .single();

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

  await supabase.from("administrasi_letter_logs").insert({
    letter_id: id,
    action: "printed",
    user_id: session.userId,
  });

  const printScript = `
    <script>
      window.onload = function() { window.print(); };
    </script>
  `;

  const fullHtml = renderedHtml.replace("</body>", `${printScript}</body>`);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: fullHtml }}
    />
  );
}
