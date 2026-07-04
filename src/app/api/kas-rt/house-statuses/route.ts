"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { HouseTransactionStatus } from "@/types/kas-rt";

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const session = await getSessionFromCookie();

    // Use default for now, later get from session or context
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    // Fetch active houses
    const { data: houses, error: housesError } = await supabase
      .from("houses")
      .select("name, blok_rumah, status")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("blok_rumah");

    if (housesError) {
      return NextResponse.json(
        { message: "Gagal memuat daftar rumah." },
        { status: 500 },
      );
    }

    if (!houses || houses.length === 0) {
      return NextResponse.json([]);
    }

    const blokList = houses.map((h) => h.blok_rumah).filter(Boolean);

    if (blokList.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch transactions for 2026
    const { data: transactions, error: txError } = await supabase
      .from("kas_rt_transactions")
      .select("amount, date, reference, is_shadow")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_shadow", false)
      .is("deleted_at", null)
      .gte("date", "2026-01-01")
      .lt("date", "2027-01-01")
      .in("reference", blokList);

    if (txError) {
      return NextResponse.json(
        { message: "Gagal memuat data transaksi." },
        { status: 500 },
      );
    }

    // Aggregate data
    const houseMap = new Map<string, HouseTransactionStatus>();

    houses.forEach((h) => {
      if (h.blok_rumah) {
        houseMap.set(h.blok_rumah, {
          blokRumah: h.blok_rumah,
          name: h.name,
          status: h.status,
          total2026: 0,
          monthlyStatuses: Array(12).fill(0),
        });
      }
    });

    (transactions || []).forEach((tx) => {
      if (tx.reference && houseMap.has(tx.reference)) {
        const house = houseMap.get(tx.reference)!;
        const date = new Date(tx.date);
        const month = date.getMonth(); // 0-11
        house.total2026 += Number(tx.amount);
        house.monthlyStatuses[month] += Number(tx.amount);
      }
    });

    // Convert to array
    const statuses = Array.from(houseMap.values()).sort((a, b) =>
      a.blokRumah.localeCompare(b.blokRumah),
    );

    return NextResponse.json(statuses);
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan tak terduga." },
      { status: 500 },
    );
  }
}
