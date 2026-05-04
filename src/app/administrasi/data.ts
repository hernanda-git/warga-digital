import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import type { AdministrasiCategory, AdministrasiLetter, AdministrasiNumberConfig } from "@/types/administrasi";

export async function requireAuth() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

export async function fetchCategories(): Promise<AdministrasiCategory[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("administrasi_categories")
      .select(`
        *,
        letter_types:administrasi_letter_types(
          id,
          code,
          name,
          slug,
          description,
          sort_order,
          is_active
        )
      `)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .eq("letter_types.is_active", true)
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "letter_types", ascending: true });

    return (data ?? []) as unknown as AdministrasiCategory[];
  } catch {
    return [];
  }
}

export async function fetchLetters(userId: string, limit = 10): Promise<AdministrasiLetter[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("administrasi_letters")
      .select(`
        *,
        letter_type:administrasi_letter_types!administrasi_letters_letter_type_id_fkey(id, code, name, slug)
      `)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(0, limit - 1);

    return (data ?? []) as unknown as AdministrasiLetter[];
  } catch {
    return [];
  }
}

export async function fetchNumberConfig(): Promise<AdministrasiNumberConfig | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("administrasi_number_configs")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    return data as AdministrasiNumberConfig | null;
  } catch {
    return null;
  }
}
