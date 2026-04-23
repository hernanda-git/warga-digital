"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import ExcelJS from "exceljs";
import { PDFDocument, rgb } from "pdf-lib";

// ── Helper: Convert Date to YYYY-MM-DD (timezone-aware) ────────────────────
function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

// ── POST /api/kas-rt/summary/export ─────────────────────────────────────────
// Export summary data to PDF or Excel format
export async function POST(request: Request) {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    // ── Parse request body ─────────────────────────────────────────────────
    const body = await request.json();
    const { format, year, month } = body as {
      format: "pdf" | "excel";
      year: number;
      month: number; // 1-indexed
    };

    if (!format || !year || !month) {
      return NextResponse.json(
        { message: "Format, year, dan month diperlukan." },
        { status: 400 },
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: "Bulan tidak valid. Gunakan 1-12." },
        { status: 400 },
      );
    }

    // ── Calculate date boundaries ──────────────────────────────────────────
    const targetMonth = month - 1; // Convert to 0-indexed
    const selectedMonthStart = new Date(year, targetMonth, 1);
    const selectedMonthEnd = new Date(year, targetMonth + 1, 0);
    const selectedMonthLabel = selectedMonthStart.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    const supabase = createServerClient();

    // ── Fetch transactions for the selected month only ──────────────────────
    const selectedMonthStartStr = toDateInputValue(selectedMonthStart);
    const selectedMonthEndStr = toDateInputValue(selectedMonthEnd);

    const { data: selectedMonthTx, error: txError } = await supabase
      .from("kas_rt_transactions")
      .select("type, amount, date, category, reference, title")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .is("deleted_at", null)
      .gte("date", selectedMonthStartStr)
      .lte("date", selectedMonthEndStr);

    if (txError) {
      console.error("[Kas RT] Export fetch error:", txError);
      return NextResponse.json(
        { message: "Gagal memuat data transaksi." },
        { status: 500 },
      );
    }

    const transactions = selectedMonthTx ?? [];

    let income = 0;
    let expense = 0;
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const tx of selectedMonthTx) {
      const amount = Number(tx.amount);
      if (tx.type === "income") {
        income += amount;
      } else {
        expense += amount;
      }

      const catKey = tx.category ?? "Lainnya";
      const existing = categoryMap.get(catKey) ?? { amount: 0, count: 0 };
      categoryMap.set(catKey, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    }

    const net = income - expense;
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage:
          income + expense > 0 ? (data.amount / (income + expense)) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ── Generate export based on format ─────────────────────────────────────
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Ringkasan Kas RT");

      // Set column widths
      worksheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
        { width: 10 },
      ];

      // Header cell A1
      worksheet.mergeCells("A1:E1");
      const headerCell = worksheet.getCell("A1");
      headerCell.value = `Laporan Kas RT - ${selectedMonthLabel}`;
      headerCell.style = {
        font: { size: 16, bold: true },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF10B981" },
        },
        alignment: { horizontal: "center" },
      };

      // Summary section header
      worksheet.mergeCells("A3:E3");
      const summaryHeader = worksheet.getCell("A3");
      summaryHeader.value = "Ringkasan";
      summaryHeader.style = { font: { size: 14, bold: true } };

      // Summary values
      worksheet.getCell("A5").value = "Pemasukan";
      const incomeCell = worksheet.getCell("B5");
      incomeCell.value = income;
      incomeCell.style = { numFmt: '"Rp"#,##0' };

      worksheet.getCell("A6").value = "Pengeluaran";
      const expenseCell = worksheet.getCell("B6");
      expenseCell.value = expense;
      expenseCell.style = { numFmt: '"Rp"#,##0' };

      worksheet.getCell("A7").value = "Net";
      const netCell = worksheet.getCell("B7");
      netCell.value = net;
      netCell.style = { numFmt: '"Rp"#,##0' };

      // Category breakdown header
      worksheet.getCell("A10").value = "Kategori";
      worksheet.getCell("B10").value = "Jumlah";
      worksheet.getCell("C10").value = "Transaksi";
      worksheet.getCell("D10").value = "%";
      const headerCells = ["A10", "B10", "C10", "D10"];
      for (const cellRef of headerCells) {
        const cell = worksheet.getCell(cellRef);
        cell.style = {
          font: { bold: true },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE5E7EB" },
          },
        };
      }

      // Category data rows
      let rowIndex = 11;
      for (const cat of byCategory) {
        worksheet.getCell(`A${rowIndex}`).value = cat.category;

        const amountCell = worksheet.getCell(`B${rowIndex}`);
        amountCell.value = cat.amount;
        amountCell.style = { numFmt: '"Rp"#,##0' };

        worksheet.getCell(`C${rowIndex}`).value = cat.count;
        worksheet.getCell(`D${rowIndex}`).value =
          `${cat.percentage.toFixed(1)}%`;
        rowIndex++;
      }

      // Generate Excel file and return as downloadable response
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `laporan-kas-rt-${selectedMonthLabel
        .toLowerCase()
        .replace(/\s/g, "-")}.xlsx`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size

      const { width, height } = page.getSize();
      const margin = 50;

      // Embed fonts
      const titleFont = await pdfDoc.embedFont("Helvetica-Bold");
      const regularFont = await pdfDoc.embedFont("Helvetica");
      const boldFont = await pdfDoc.embedFont("Helvetica-Bold");

      // Title
      let y = height - margin;
      page.drawText(`Laporan Kas RT - ${selectedMonthLabel}`, {
        x: margin,
        y,
        size: 24,
        font: titleFont,
        color: rgb(0, 0, 0),
      });

      y -= 50;

      // Summary section header
      page.drawText("Ringkasan", {
        x: margin,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= 40;
      page.drawText(`Pemasukan: Rp ${income.toLocaleString("id-ID")}`, {
        x: margin + 20,
        y,
        size: 12,
        font: regularFont,
        color: rgb(0, 0, 0),
      });

      y -= 25;
      page.drawText(`Pengeluaran: Rp ${expense.toLocaleString("id-ID")}`, {
        x: margin + 20,
        y,
        size: 12,
        font: regularFont,
        color: rgb(0, 0, 0),
      });

      y -= 25;
      page.drawText(`Net: Rp ${net.toLocaleString("id-ID")}`, {
        x: margin + 20,
        y,
        size: 12,
        font: regularFont,
        color: rgb(0, 0, 0),
      });

      y -= 50;
      page.drawText("Breakdown per Kategori", {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= 30;
      for (const cat of byCategory.slice(0, 20)) {
        // Limit to 20 categories to fit page
        if (y < margin + 50) break;

        const text = `${cat.category}: Rp ${cat.amount.toLocaleString(
          "id-ID",
        )} (${cat.count} tx, ${cat.percentage.toFixed(1)}%)`;
        page.drawText(text, {
          x: margin + 20,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0, 0, 0),
        });
        y -= 15;
      }

      const pdfBytes = await pdfDoc.save();
      const filename = `laporan-kas-rt-${selectedMonthLabel
        .toLowerCase()
        .replace(/\s/g, "-")}.pdf`;

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      { message: "Format tidak didukung. Gunakan 'pdf' atau 'excel'." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[Kas RT] Export error:", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengekspor." },
      { status: 500 },
    );
  }
}
