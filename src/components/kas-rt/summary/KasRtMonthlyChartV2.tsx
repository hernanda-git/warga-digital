"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem,
  ScriptableScaleContext,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatRupiahCompact } from "@/lib/kas-rt-utils";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface KasRtMonthlyChartV2Props {
  yearlyTrend: KasRtSummaryResponse["yearlyTrend"];
  isLoading?: boolean;
}

/**
 * Custom tooltip for the bar chart
 */
function createTooltipLabel(item: TooltipItem<"bar">): string {
  const value = item.raw as number;
  const datasetLabel = item.dataset.label || "";
  return `${datasetLabel}: ${formatRupiahCompact(value)}`;
}

/**
 * Format Y-axis labels with compact notation (K for thousands, Jt for millions)
 */
function formatYAxisLabel(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} Jt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

/**
 * Monthly trend bar chart showing income vs expense for year-to-date
 * Styled to match the redesign with candle-style grouped bars and callout badges
 */
export function KasRtMonthlyChartV2({
  yearlyTrend,
  isLoading = false,
}: KasRtMonthlyChartV2Props) {
  const lastMonthIndex = yearlyTrend.length - 1;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chart to the rightmost position on mount
  useEffect(() => {
    if (chartContainerRef.current) {
      // Scroll to the far right to show the latest month
      chartContainerRef.current.scrollLeft =
        chartContainerRef.current.scrollWidth -
        chartContainerRef.current.clientWidth;
    }
  }, []);

  // Chart data with custom coloring for current vs previous months
  const chartData = useMemo<ChartData<"bar">>(() => {
    const labels = yearlyTrend.map((item) => item.label);
    const incomeData = yearlyTrend.map((item) => item.income);
    const expenseData = yearlyTrend.map((item) => item.expense);

    // Create backgroundColor arrays with different colors for current vs previous months
    const incomeColors = incomeData.map((_, i) =>
      i === lastMonthIndex ? "#10b981" : "#a7f3d0",
    );
    const expenseColors = expenseData.map((_, i) =>
      i === lastMonthIndex ? "#ef4444" : "#fca5a5",
    );

    return {
      labels,
      datasets: [
        {
          label: "Pemasukan",
          data: incomeData,
          backgroundColor: incomeColors,
          borderRadius: [4, 4, 0, 0],
          barPercentage: 0.35,
          categoryPercentage: 0.8,
          barThickness: 8,
        },
        {
          label: "Pengeluaran",
          data: expenseData,
          backgroundColor: expenseColors,
          borderRadius: [4, 4, 0, 0],
          barPercentage: 0.35,
          categoryPercentage: 0.8,
          barThickness: 8,
        },
      ],
    };
  }, [yearlyTrend, lastMonthIndex]);

  // Calculate max value for Y axis
  const maxValue = useMemo(() => {
    const allValues = yearlyTrend.flatMap((d) => [d.income, d.expense]);
    return Math.max(...allValues) * 1.1;
  }, [yearlyTrend]);

  // Chart options with custom styling
  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          titleColor: "#111827",
          bodyColor: "#374151",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          titleFont: {
            size: 13,
            weight: "bold",
            family: "'Inter', sans-serif",
          },
          bodyFont: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          callbacks: {
            label: (context) => createTooltipLabel(context),
          },
        },
      },
      barGap: 12,
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
              family: "'Inter', sans-serif",
            },
            color: (ctx: ScriptableScaleContext) => {
              const index = ctx.index ?? 0;
              return index === lastMonthIndex ? "#1f2937" : "#9ca3af";
            },
            weight: (ctx: ScriptableScaleContext) => {
              const index = ctx.index ?? 0;
              return index === lastMonthIndex ? "bold" : "normal";
            },
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          grid: {
            color: "#f0f0f0",
            borderDash: [3, 3],
          },
          ticks: {
            font: {
              size: 10,
              family: "'Inter', sans-serif",
            },
            color: "#9ca3af",
            padding: 8,
            callback: (value) => formatYAxisLabel(value as number),
          },
          beginAtZero: true,
          max: maxValue,
        },
      },
    }),
    [lastMonthIndex, maxValue],
  );

  if (isLoading) {
    return (
      <div className="mx-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200"></div>
            <div className="h-3 w-20 rounded bg-gray-200"></div>
          </div>
          <div className="mt-4 h-[220px] w-full overflow-x-auto">
            <div className="h-[220px] min-w-[600px] rounded bg-gray-100"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-4 rounded-xl bg-white p-4 shadow-sm"
      aria-label="Tren 12 bulan"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Tren 12 Bulan</h3>
        <span className="text-xs text-gray-500">dalam Rupiah</span>
      </div>

      {/* Chart container with horizontal scroll */}
      <div
        ref={chartContainerRef}
        className="mt-4 overflow-x-auto overflow-y-hidden scroll-smooth"
      >
        <div className="min-w-[600px] h-[220px]">
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
