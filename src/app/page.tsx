import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const session = await getSessionFromCookie();
  
  if (!session) {
    redirect("/auth/login");
  }
  
  const supabase = createServerClient();
  const { data: onboarding } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("user_id", session.userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!onboarding) {
    redirect("/onboarding");
  }
  
  redirect("/landing");
}
