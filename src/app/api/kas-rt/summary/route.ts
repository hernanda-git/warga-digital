"use server";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { fetchKasRtSummaryData } from "@/lib/kas-rt-summary";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month");

    const now = new Date();
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const targetMonth = monthParam
      ? parseInt(monthParam, 10) - 1
      : now.getMonth();

    if (targetMonth < 0 || targetMonth > 11) {
      return NextResponse.json(
        { message: "Bulan tidak valid. Gunakan 1-12." },
        { status: 400 },
      );
    }

    const summary = await fetchKasRtSummaryData({
      year: targetYear,
      month: targetMonth,
    });

    if (!summary) {
      return NextResponse.json(
        { message: "Gagal memuat data ringkasan." },
        { status: 500 },
      );
    }

    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat ringkasan." },
      { status: 500 },
    );
  }
}
