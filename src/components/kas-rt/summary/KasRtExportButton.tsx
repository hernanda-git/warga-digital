"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";

interface KasRtExportButtonProps {
  summary: {
    selectedMonth: {
      year: number;
      month: number;
      label: string;
      income: number;
      expense: number;
      net: number;
      transactionCount: number;
      byCategory: Array<{
        category: string;
        amount: number;
        count: number;
        percentage: number;
      }>;
    };
    previousMonth: {
      income: number;
      expense: number;
      net: number;
      label: string;
    };
    yearlyTrend: Array<{
      month: string;
      label: string;
      income: number;
      expense: number;
    }>;
    iplCollection: {
      totalHouses: number;
      paidHouses: number;
      percentage: number;
      unpaidHouses: string[];
    };
    stats: {
      avgPerDay: number;
      bestDay: { date: string; amount: number };
      worstDay: { date: string; amount: number };
      highestCategory: { name: string; amount: number };
    };
  };
  isLoading?: boolean;
}

type ExportFormat = "pdf" | "excel" | "image";

/**
 * Export button with dropdown for PDF, Excel, and Image export
 * Redesigned as a pill button with icon + text
 */
export function KasRtExportButton({
  summary,
  isLoading = false,
}: KasRtExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const exportToPDF = useCallback(async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`/api/kas-rt/summary/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "pdf",
          year: summary.selectedMonth.year,
          month: summary.selectedMonth.month,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-kas-rt-${summary.selectedMonth.label.replace(/\s/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal mengekspor PDF. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  }, [summary]);

  const exportToExcel = useCallback(async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`/api/kas-rt/summary/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "excel",
          year: summary.selectedMonth.year,
          month: summary.selectedMonth.month,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate Excel");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-kas-rt-${summary.selectedMonth.label.replace(/\s/g, "-").toLowerCase()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal mengekspor Excel. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  }, [summary]);

  const exportToImage = useCallback(async () => {
    if (!exportRef.current) return;

    setIsExporting(true);
    try {
      const element = exportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-kas-rt-${summary.selectedMonth.label.replace(/\s/g, "-").toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal mengekspor gambar. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  }, [summary]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      switch (format) {
        case "pdf":
          void exportToPDF();
          break;
        case "excel":
          void exportToExcel();
          break;
        case "image":
          void exportToImage();
          break;
      }
    },
    [exportToPDF, exportToExcel, exportToImage],
  );

  const handleToggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev);
  }, []);

  const handleCloseDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  return (
    <div className="relative" ref={exportRef}>
      {/* Export button - pill style with icon + text */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={isLoading || isExporting}
        className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-700 active:scale-95 disabled:opacity-50"
        aria-label="Ekspor laporan"
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span>Ekspor</span>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={handleCloseDropdown}
            aria-hidden="true"
          />

          {/* Menu */}
          <div
            className="absolute right-0 top-12 z-20 w-48 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="export-menu"
          >
            <div className="py-1" role="none">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                Ekspor PDF
              </button>

              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={isExporting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                Ekspor Excel
              </button>

              <button
                type="button"
                onClick={() => handleExport("image")}
                disabled={isExporting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Ekspor Gambar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
