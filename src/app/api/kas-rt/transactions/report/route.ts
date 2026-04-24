"use server";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

// ── Types ────────────────────────────────────────────────────────────────────

type TransactionRow = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  reference: string | null;
  details: string | null;
  category: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── PDF Builder (pdf-lib) ────────────────────────────────────────────────────

async function buildPdf(
  rows: TransactionRow[],
  startLabel: string,
  endLabel: string,
  categoryFilter: string | null,
  blockFilter: string | null,
  totalIncome: number,
  totalExpense: number,
  net: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4 width in points
  const PAGE_HEIGHT = 841.89; // A4 height in points
  const MARGIN = 50;
  const LINE_HEIGHT = 14;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawText = (
    text: string,
    xPos: number,
    yPos: number,
    fnt = font,
    size = 10,
    color = rgb(0, 0, 0),
  ) => {
    page.drawText(text, { x: xPos, y: yPos, font: fnt, size, color });
  };

  const ensureSpace = (linesNeeded: number) => {
    const needed = linesNeeded * LINE_HEIGHT;
    if (y - MARGIN < needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Title & Header ─────────────────────────────────────────────────────
  drawText("LAPORAN KAS RT 03", MARGIN, y, boldFont, 16);
  y -= LINE_HEIGHT * 1.5;

  drawText(
    `Periode: ${startLabel} s.d. ${endLabel}`,
    MARGIN,
    y,
    font,
    10,
    rgb(0.3, 0.3, 0.3),
  );
  y -= LINE_HEIGHT;

  if (categoryFilter) {
    drawText(
      `Filter kategori: ${categoryFilter}`,
      MARGIN,
      y,
      font,
      10,
      rgb(0.3, 0.3, 0.3),
    );
    y -= LINE_HEIGHT;
  }
  if (blockFilter) {
    drawText(
      `Filter blok: ${blockFilter}`,
      MARGIN,
      y,
      font,
      10,
      rgb(0.3, 0.3, 0.3),
    );
    y -= LINE_HEIGHT;
  }

  y -= LINE_HEIGHT * 0.5;

  // ── Summary Section ─────────────────────────────────────────────────────
  drawText("RINGKASAN", MARGIN, y, boldFont, 12);
  y -= LINE_HEIGHT;
  drawText(`Total pemasukan  : ${formatCurrency(totalIncome)}`, MARGIN, y);
  y -= LINE_HEIGHT;
  drawText(`Total pengeluaran: ${formatCurrency(totalExpense)}`, MARGIN, y);
  y -= LINE_HEIGHT;
  drawText(
    `Saldo bersih     : ${formatCurrency(net)}`,
    MARGIN,
    y,
    boldFont,
    10,
    net >= 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1),
  );
  y -= LINE_HEIGHT * 1.5;

  // ── Transaction Table ───────────────────────────────────────────────────
  drawText("RINCIAN TRANSAKSI", MARGIN, y, boldFont, 12);
  y -= LINE_HEIGHT;

  // Column positions
  const colDate = MARGIN;
  const colTitle = MARGIN + 80;
  const colBlock = MARGIN + 280;
  const colCategory = MARGIN + 340;
  const colType = MARGIN + 420;
  const colAmount = MARGIN + 490;

  // Header row
  drawText("Tanggal", colDate, y, boldFont, 8);
  drawText("Judul", colTitle, y, boldFont, 8);
  drawText("Blok", colBlock, y, boldFont, 8);
  drawText("Kategori", colCategory, y, boldFont, 8);
  drawText("Tipe", colType, y, boldFont, 8);
  drawText("Nominal", colAmount, y, boldFont, 8);
  y -= LINE_HEIGHT * 0.8;

  // Separator line
  page.drawRectangle({
    x: MARGIN,
    y: y - 1,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= LINE_HEIGHT * 0.5;

  if (rows.length === 0) {
    drawText(
      "Tidak ada transaksi untuk filter ini.",
      MARGIN,
      y,
      font,
      10,
      rgb(0.5, 0.5, 0.5),
    );
  } else {
    ensureSpace(rows.length * 2 + 2);

    for (const row of rows) {
      const typeLabel = row.type === "income" ? "Pemasukan" : "Pengeluaran";
      const typeColor =
        row.type === "income" ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1);

      drawText(formatDateShort(row.date), colDate, y, font, 8);
      drawText(row.title ?? "-", colTitle, y, font, 8);
      drawText(row.reference ?? "-", colBlock, y, font, 8);
      drawText(row.category ?? "-", colCategory, y, font, 8);
      drawText(typeLabel, colType, y, font, 8, typeColor);
      drawText(formatCurrency(Number(row.amount)), colAmount, y, font, 8);
      y -= LINE_HEIGHT;

      if (row.details?.trim()) {
        drawText(
          `Catatan: ${row.details}`,
          colTitle,
          y,
          font,
          7,
          rgb(0.5, 0.5, 0.5),
        );
        y -= LINE_HEIGHT * 0.7;
      }
    }
  }

  return pdfDoc.save();
}

// ── Excel Builder (exceljs) ──────────────────────────────────────────────────

async function buildExcel(
  rows: TransactionRow[],

  startLabel: string,

  endLabel: string,

  categoryFilter: string | null,

  blockFilter: string | null,

  totalIncome: number,

  totalExpense: number,

  net: number,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Warga Digital";

  workbook.created = new Date();

  workbook.modified = new Date();

  // ── Color Palette ──────────────────────────────────────────────────────────

  const GREEN_DARK = "1A6B3C";

  const GREEN_MID = "2D8653";

  const GREEN_LIGHT = "E8F5EE";

  const GREEN_STRIPE = "F4FAF6";

  const RED_DARK = "C0392B";
  const BORDER_COLOR = "D0D5DD";

  const GREY_TEXT = "667085";

  const WHITE = "FFFFFF";

  const thinBorder: Partial<ExcelJS.Border> = {
    style: "thin",

    color: { argb: BORDER_COLOR },
  };

  const medBorder: Partial<ExcelJS.Border> = {
    style: "medium",

    color: { argb: GREEN_DARK },
  };

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",

    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // ── Group transactions by month ─────────────────────────────────────────────
  const monthlyData = new Map<string, TransactionRow[]>();
  const monthlyStats = new Map<
    string,
    { income: number; expense: number; count: number }
  >();

  for (const row of rows) {
    const date = new Date(row.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
      monthlyStats.set(monthKey, { income: 0, expense: 0, count: 0 });
    }
    monthlyData.get(monthKey)!.push(row);
    const stats = monthlyStats.get(monthKey)!;
    stats.count++;
    if (row.type === "income") stats.income += Number(row.amount);
    else stats.expense += Number(row.amount);
  }

  const sortedMonths = Array.from(monthlyData.keys()).sort();

  // ── Category Totals ─────────────────────────────────────────────────────────

  const categoryTotals = new Map<
    string,
    { income: number; expense: number; count: number }
  >();
  for (const row of rows) {
    const cat = row.category ?? "Lainnya";
    if (!categoryTotals.has(cat)) {
      categoryTotals.set(cat, { income: 0, expense: 0, count: 0 });
    }
    const stats = categoryTotals.get(cat)!;
    stats.count++;
    if (row.type === "income") stats.income += Number(row.amount);
    else stats.expense += Number(row.amount);
  }

  // ── Create Summary Sheet ─────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { key: "col1", width: 30 },
    { key: "col2", width: 25 },
    { key: "col3", width: 40 },
  ];

  let currentRow = 1;

  // Title
  const titleRow = summarySheet.getRow(currentRow);

  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "Laporan Kas RT - Ringkasan Komprehensif";
  titleCell.font = { bold: true, size: 18, color: { argb: GREEN_DARK } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  summarySheet.mergeCells(currentRow, 1, currentRow, 3);

  currentRow++;

  // Period info
  currentRow++;
  const periodRow = summarySheet.getRow(currentRow);
  periodRow.height = 18;
  const periodCell = periodRow.getCell(1);

  periodCell.value = `Periode: ${startLabel} s.d. ${endLabel}`;

  periodCell.font = { size: 11, color: { argb: GREY_TEXT } };

  summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  currentRow++;

  if (categoryFilter) {
    currentRow++;

    const filterRow = summarySheet.getRow(currentRow);

    filterRow.height = 16;

    const filterCell = filterRow.getCell(1);

    filterCell.value = `Filter Kategori: ${categoryFilter}`;

    filterCell.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };

    summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  }

  if (blockFilter) {
    currentRow++;
    const filterRow = summarySheet.getRow(currentRow);
    filterRow.height = 16;
    const filterCell = filterRow.getCell(1);
    filterCell.value = `Filter Blok: ${blockFilter}`;

    filterCell.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };

    summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  }

  currentRow += 2;

  // Overall Summary Section
  const overallHeader = summarySheet.getRow(currentRow);
  overallHeader.height = 22;
  const ohCell = overallHeader.getCell(1);

  ohCell.value = "Ringkasan Keseluruhan";
  ohCell.font = { bold: true, size: 14, color: { argb: GREEN_DARK } };
  ohCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  currentRow++;

  const overallMetrics = [
    {
      metric: "Total Pemasukan",
      value: totalIncome,
      notes: "Seluruh pemasukan periode",
    },
    {
      metric: "Total Pengeluaran",
      value: totalExpense,
      notes: "Seluruh pengeluaran periode",
    },
    {
      metric: "Saldo Bersih",
      value: net,
      notes: net >= 0 ? "Keseluruhan kas masuk" : "Keseluruhan kas keluar",
    },
  ];

  for (const item of overallMetrics) {
    const r = summarySheet.getRow(currentRow);
    r.height = 20;
    const metricCell = r.getCell(1);

    metricCell.value = item.metric;
    metricCell.font = { size: 11, bold: true, color: { argb: GREEN_DARK } };
    metricCell.alignment = { horizontal: "left", vertical: "middle" };
    const valueCell = r.getCell(2);
    valueCell.value = item.value;

    valueCell.numFmt = "#,##0";
    valueCell.font = {
      size: 11,
      bold: true,
      color: {
        argb: item.metric === "Saldo Bersih" && net < 0 ? RED_DARK : GREEN_DARK,
      },
    };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };

    const notesCell = r.getCell(3);
    notesCell.value = item.notes;
    notesCell.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };
    notesCell.alignment = { horizontal: "left", vertical: "middle" };
    r.eachCell((cell) => {
      cell.border = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      };
    });
    currentRow++;
  }

  currentRow += 2;

  // Monthly Breakdown Section
  const monthlyHeader = summarySheet.getRow(currentRow);
  monthlyHeader.height = 22;
  const mhCell = monthlyHeader.getCell(1);
  mhCell.value = "Breakdown per Bulan";
  mhCell.font = { bold: true, size: 14, color: { argb: GREEN_DARK } };
  mhCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };

  summarySheet.mergeCells(currentRow, 1, currentRow, 3);

  currentRow++;

  const monthHeaderRow = summarySheet.getRow(currentRow);
  monthHeaderRow.height = 20;
  const monthHeaders = [
    "Bulan",
    "Pemasukan",
    "Pengeluaran",
    "Net",
    "Transaksi",
  ];

  monthHeaders.forEach((header, idx) => {
    const cell = monthHeaderRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_MID },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };

    cell.border = {
      top: medBorder,
      bottom: medBorder,
      left: thinBorder,
      right: thinBorder,
    };
  });
  currentRow++;

  for (const monthKey of sortedMonths) {
    const stats = monthlyStats.get(monthKey)!;

    const [year, monthNum] = monthKey.split("-").map(Number);
    const monthName = `${monthNames[monthNum - 1]} ${year}`;
    const monthNet = stats.income - stats.expense;

    const r = summarySheet.getRow(currentRow);
    r.height = 18;
    const cells = [
      { value: monthName, align: "left" as const, format: false },

      { value: stats.income, align: "right" as const, format: true },
      { value: stats.expense, align: "right" as const, format: true },
      { value: monthNet, align: "right" as const, format: true },
      { value: stats.count, align: "center" as const, format: false },
    ];
    cells.forEach((cellData, idx) => {
      const cell = r.getCell(idx + 1);
      cell.value = cellData.value;
      cell.alignment = { horizontal: cellData.align, vertical: "middle" };
      if (cellData.format) cell.numFmt = "#,##0";
      cell.font = { size: 10 };
      if (idx === 3) {
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: monthNet >= 0 ? GREEN_DARK : RED_DARK },
        };
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: currentRow % 2 === 0 ? GREEN_STRIPE : WHITE },
      };
      cell.border = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      };
    });
    currentRow++;
  }

  currentRow += 2;

  // Category Summary Section
  const categoryHeader = summarySheet.getRow(currentRow);
  categoryHeader.height = 22;
  const chCell = categoryHeader.getCell(1);
  chCell.value = "Ringkasan per Kategori";
  chCell.font = { bold: true, size: 14, color: { argb: GREEN_DARK } };
  chCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  currentRow++;

  const catHeaderRow = summarySheet.getRow(currentRow);
  catHeaderRow.height = 20;

  const catHeaders = [
    "Kategori",
    "Pemasukan",
    "Pengeluaran",
    "Total",
    "Transaksi",
  ];
  catHeaders.forEach((header, idx) => {
    const cell = catHeaderRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_MID },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };

    cell.border = {
      top: medBorder,
      bottom: medBorder,
      left: thinBorder,
      right: thinBorder,
    };
  });
  currentRow++;

  const sortedCategories = Array.from(categoryTotals.entries()).sort(
    (a, b) => b[1].income + b[1].expense - (a[1].income + a[1].expense),
  );

  for (const [category, stats] of sortedCategories) {
    const r = summarySheet.getRow(currentRow);
    r.height = 18;
    const catTotal = stats.income + stats.expense;
    const cells = [
      { value: category, align: "left" as const, format: false },
      { value: stats.income, align: "right" as const, format: true },
      { value: stats.expense, align: "right" as const, format: true },
      { value: catTotal, align: "right" as const, format: true },
      { value: stats.count, align: "center" as const, format: false },
    ];
    cells.forEach((cellData, idx) => {
      const cell = r.getCell(idx + 1);
      cell.value = cellData.value;
      cell.alignment = { horizontal: cellData.align, vertical: "middle" };
      if (cellData.format) cell.numFmt = "#,##0";
      cell.font = { size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: currentRow % 2 === 0 ? GREEN_STRIPE : WHITE },
      };
      cell.border = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      };
    });
    currentRow++;
  }

  currentRow += 2;

  // Statistics Section
  const statsHeader = summarySheet.getRow(currentRow);
  statsHeader.height = 22;
  const sthCell = statsHeader.getCell(1);
  sthCell.value = "Statistik Tambahan";
  sthCell.font = { bold: true, size: 14, color: { argb: GREEN_DARK } };
  sthCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };

  summarySheet.mergeCells(currentRow, 1, currentRow, 3);
  currentRow++;

  const totalTransactions = rows.length;
  const avgIncome =
    totalIncome / Math.max(rows.filter((r) => r.type === "income").length, 1);
  const avgExpense =
    totalExpense / Math.max(rows.filter((r) => r.type === "expense").length, 1);
  const avgTransaction = (totalIncome + totalExpense) / totalTransactions;

  const statsData = [
    {
      metric: "Total Transaksi",
      value: totalTransactions,
      notes: "Jumlah semua transaksi",
    },
    {
      metric: "Rata-rata Pemasukan",
      value: avgIncome,
      notes: "Rata-rata per transaksi pemasukan",
    },

    {
      metric: "Rata-rata Pengeluaran",
      value: avgExpense,
      notes: "Rata-rata per transaksi pengeluaran",
    },
    {
      metric: "Rata-rata Transaksi",
      value: avgTransaction,
      notes: "Rata-rata semua transaksi",
    },
  ];

  for (const item of statsData) {
    const r = summarySheet.getRow(currentRow);
    r.height = 20;

    const metricCell = r.getCell(1);
    metricCell.value = item.metric;

    metricCell.font = { size: 11, bold: true, color: { argb: GREEN_DARK } };
    metricCell.alignment = { horizontal: "left", vertical: "middle" };
    const valueCell = r.getCell(2);
    valueCell.value = item.value;
    valueCell.numFmt = item.metric.includes("Rata-rata") ? "#,##0.0" : "#,##0";
    valueCell.font = { size: 11 };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };

    const notesCell = r.getCell(3);
    notesCell.value = item.notes;

    notesCell.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };
    notesCell.alignment = { horizontal: "left", vertical: "middle" };

    r.eachCell((cell) => {
      cell.border = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      };
    });
    currentRow++;
  }

  // ── Create Monthly Sheets ───────────────────────────────────────────────────
  const COL_COUNT_MONTH = 8;

  const colHeaders = [
    "No",
    "Tanggal",
    "Judul",
    "Blok",
    "Kategori",
    "Tipe",
    "Nominal",
    "Details",
  ];

  for (const monthKey of sortedMonths) {
    const monthRows = monthlyData.get(monthKey)!;
    const [year, monthNum] = monthKey.split("-").map(Number);
    const monthName = `${monthNames[monthNum - 1]} ${year}`;
    const sheetName = monthName.substring(0, 31); // Excel sheet name limit

    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "date", width: 13 },
      { key: "title", width: 35 },
      { key: "block", width: 12 },
      { key: "category", width: 18 },
      { key: "type", width: 12 },
      { key: "amount", width: 18 },
      { key: "details", width: 35 },
    ];

    let currentMonthRow = 1;

    // Title
    const mTitleRow = sheet.getRow(currentMonthRow);
    mTitleRow.height = 28;
    const mTitleCell = mTitleRow.getCell(1);
    mTitleCell.value = `Laporan Kas RT - ${monthName}`;
    mTitleCell.font = { bold: true, size: 16, color: { argb: GREEN_DARK } };
    mTitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };
    sheet.mergeCells(currentMonthRow, 1, currentMonthRow, COL_COUNT_MONTH);

    currentMonthRow++;

    // Filter info
    currentMonthRow++;
    const mFilterRow = sheet.getRow(currentMonthRow);
    mFilterRow.height = 16;
    const mFilterCell = mFilterRow.getCell(1);
    let filterText = "";
    if (categoryFilter) filterText += `Kategori: ${categoryFilter} `;
    if (blockFilter) filterText += `Blok: ${blockFilter}`;

    mFilterCell.value = filterText.trim() || "Semua data";
    mFilterCell.font = { size: 9, italic: true, color: { argb: GREY_TEXT } };
    sheet.mergeCells(currentMonthRow, 1, currentMonthRow, COL_COUNT_MONTH);
    currentMonthRow++;

    currentMonthRow++;

    // Table header
    const tableHeaderRow = sheet.getRow(currentMonthRow);
    tableHeaderRow.height = 22;
    const thCell = tableHeaderRow.getCell(1);
    thCell.value = "Rincian Transaksi";
    thCell.font = { bold: true, size: 12, color: { argb: GREEN_DARK } };

    thCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };
    sheet.mergeCells(currentMonthRow, 1, currentMonthRow, COL_COUNT_MONTH);

    currentMonthRow++;

    // Column headers
    const colHeaderRow = sheet.getRow(currentMonthRow);
    colHeaderRow.height = 20;
    for (let i = 0; i < colHeaders.length; i++) {
      const cell = colHeaderRow.getCell(i + 1);
      cell.value = colHeaders[i];

      cell.font = { bold: true, size: 10, color: { argb: WHITE } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: GREEN_MID },
      };

      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: medBorder,
        bottom: medBorder,
        left: thinBorder,
        right: thinBorder,
      };
    }

    currentMonthRow++;

    const dataStartRow = currentMonthRow;
    let monthTotalIncome = 0;

    let monthTotalExpense = 0;

    // Data rows

    for (let i = 0; i < monthRows.length; i++) {
      const row = monthRows[i];
      const isLast = i === monthRows.length - 1;
      const isEven = i % 2 === 0;
      const rowBg = isEven ? GREEN_STRIPE : WHITE;
      const amount = Number(row.amount);
      if (row.type === "income") monthTotalIncome += amount;
      else monthTotalExpense += amount;

      const r = sheet.getRow(currentMonthRow);
      r.height = 18;
      const cells = [
        { value: i + 1, align: "center" as const },
        { value: formatDateShort(row.date), align: "center" as const },
        { value: row.title ?? "-", align: "left" as const },
        { value: row.reference ?? "-", align: "center" as const },
        { value: row.category ?? "-", align: "left" as const },
        {
          value: row.type === "income" ? "Pemasukan" : "Pengeluaran",
          align: "center" as const,
        },

        { value: amount, align: "right" as const },

        { value: row.details ?? "-", align: "left" as const },
      ];

      for (let j = 0; j < cells.length; j++) {
        const cell = r.getCell(j + 1);
        cell.value = cells[j].value;
        cell.alignment = {
          horizontal: cells[j].align,
          vertical: "middle",
          wrapText: j === 7, // Details column has text wrapping
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBg },
        };
        cell.border = {
          top: thinBorder,
          bottom: isLast ? medBorder : thinBorder,
          left: thinBorder,
          right: thinBorder,
        };

        if (j === 5) {
          cell.font = {
            size: 10,
            color: { argb: row.type === "income" ? GREEN_DARK : RED_DARK },
          };
        } else if (j === 6) {
          cell.numFmt = "#,##0";
          cell.font = {
            size: 10,
            color: { argb: row.type === "income" ? GREEN_DARK : RED_DARK },
          };
        } else {
          cell.font = { size: 10 };
        }
      }
      currentMonthRow++;
    }

    // Totals row for this month
    const monthTotalsRow = sheet.getRow(currentMonthRow);
    monthTotalsRow.height = 22;
    const mtCell = monthTotalsRow.getCell(1);
    mtCell.value = "Total";
    mtCell.font = { bold: true, size: 11, color: { argb: GREEN_DARK } };
    mtCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };
    sheet.mergeCells(currentMonthRow, 1, currentMonthRow, COL_COUNT_MONTH - 2);

    const mtTypeCell = monthTotalsRow.getCell(COL_COUNT_MONTH - 1);
    mtTypeCell.value = "";
    mtTypeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };

    const mtAmountCell = monthTotalsRow.getCell(COL_COUNT_MONTH);
    const monthNet = monthTotalIncome - monthTotalExpense;
    mtAmountCell.value = monthNet;
    mtAmountCell.numFmt = "#,##0";
    mtAmountCell.font = {
      bold: true,
      size: 12,
      color: { argb: monthNet >= 0 ? GREEN_DARK : RED_DARK },
    };
    mtAmountCell.alignment = { horizontal: "right", vertical: "middle" };
    mtAmountCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };
    mtAmountCell.border = {
      top: medBorder,
      bottom: medBorder,
      left: thinBorder,
      right: thinBorder,
    };

    // Freeze panes

    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: dataStartRow - 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return buffer as ArrayBuffer;
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const categoryFilter = searchParams.get("category")?.trim() || null;
    const blockFilter = searchParams.get("block")?.trim() || null;
    const format = searchParams.get("format") === "excel" ? "excel" : "pdf";

    if (!start || !end) {
      return NextResponse.json(
        { message: "Tanggal mulai dan akhir wajib diisi." },
        { status: 400 },
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { message: "Tanggal mulai tidak boleh setelah tanggal akhir." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    let query = supabase
      .from("kas_rt_transactions")
      .select("id, title, amount, type, date, reference, details, category")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .is("deleted_at", null)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (categoryFilter) query = query.ilike("category", `%${categoryFilter}%`);
    if (blockFilter) query = query.ilike("reference", `%${blockFilter}%`);

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json(
        { message: "Gagal memuat transaksi untuk laporan." },
        { status: 500 },
      );
    }

    const rows = data as TransactionRow[];

    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of rows) {
      if (row.type === "income") totalIncome += Number(row.amount);
      else totalExpense += Number(row.amount);
    }
    const net = totalIncome - totalExpense;

    const startLabel = formatDateLabel(start);
    const endLabel = formatDateLabel(end);

    // ── Excel ──────────────────────────────────────────────────────────────
    if (format === "excel") {
      const buffer = await buildExcel(
        rows,
        startLabel,
        endLabel,
        categoryFilter,
        blockFilter,
        totalIncome,
        totalExpense,
        net,
      );

      const fileName = `laporan-kas-rt_${start}_sampai_${end}.xlsx`;

      return new NextResponse(buffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String((buffer as ArrayBuffer).byteLength),
        },
      });
    }

    // ── PDF ────────────────────────────────────────────────────────────────
    const pdfBytes = await buildPdf(
      rows,
      startLabel,
      endLabel,
      categoryFilter,
      blockFilter,
      totalIncome,
      totalExpense,
      net,
    );
    const fileName = `laporan-kas-rt_${start}_sampai_${end}.pdf`;

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyiapkan laporan." },
      { status: 500 },
    );
  }
}
