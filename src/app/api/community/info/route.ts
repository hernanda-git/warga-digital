import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

export interface CommunityInfoResponse {
  communityName: string;
  tenantId: string;
  communityId: string;
}

/**
 * GET /api/community/info
 * Returns public community information (name, tenantId) without requiring authentication.
 * Uses DEFAULT_TENANT_ID to identify the community.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get community info using DEFAULT_TENANT_ID
    const { data: community, error } = await supabase
      .from("communities")
      .select("id, name, tenant_id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          communityName: "Warga Digital",
          tenantId: DEFAULT_TENANT_ID,
          communityId: "",
        } as CommunityInfoResponse,
        { status: 200 },
      );
    }

    if (!community?.name) {
      return NextResponse.json(
        {
          communityName: "Warga Digital",
          tenantId: DEFAULT_TENANT_ID,
          communityId: "",
        } as CommunityInfoResponse,
        { status: 200 },
      );
    }

    return NextResponse.json({
      communityName: community.name,
      tenantId: community.tenant_id,
      communityId: community.id,
    } as CommunityInfoResponse);
  } catch (error) {
    return NextResponse.json(
      {
        communityName: "Warga Digital",
        tenantId: DEFAULT_TENANT_ID,
        communityId: "",
      } as CommunityInfoResponse,
      { status: 200 },
    );
  }
}
