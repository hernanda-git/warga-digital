import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

export interface KasRtInfoResponse {
  communityName: string;
}

/**
 * GET /api/kas-rt/info
 * Returns community info based on logged-in user's session
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's tenant from tenant_users
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (tenantUserError || !tenantUser?.tenant_id) {
      return NextResponse.json(
        { communityName: "Warga Digital" },
        { status: 200 },
      );
    }

    // Get community name from communities table
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("name")
      .eq("tenant_id", tenantUser.tenant_id)
      .maybeSingle();

    if (communityError || !community?.name) {
      return NextResponse.json(
        { communityName: "Warga Digital" },
        { status: 200 },
      );
    }

    return NextResponse.json({
      communityName: community.name,
    } as KasRtInfoResponse);
  } catch (error) {
    console.error("[Kas RT Info] Unexpected error:", error);
    return NextResponse.json(
      { communityName: "Warga Digital" },
      { status: 200 },
    );
  }
}