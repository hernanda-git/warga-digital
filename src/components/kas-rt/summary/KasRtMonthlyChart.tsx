"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatRupiahCompact } from "@/lib/kas-rt-utils";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtMonthlyChartProps {
  yearlyTrend: KasRtSummaryResponse["yearlyTrend"];
  isLoading?: boolean;
}

/**
 * Custom tooltip for the bar chart
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; dataKey: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-white p-3 shadow-lg border border-gray-100">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className={`text-xs ${
              entry.dataKey === "income" ? "text-green-600" : "text-red-600"
            }`}
          >
            {entry.name === "income" ? "Pemasukan" : "Pengeluaran"}:{" "}
            {formatRupiahCompact(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * Monthly trend bar chart showing income vs expense for the last 12 months
 * Horizontally scrollable on mobile devices
 */
export function KasRtMonthlyChart({
  yearlyTrend,
  isLoading = false,
}: KasRtMonthlyChartProps) {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    return yearlyTrend.map((item) => ({
      ...item,
      formattedIncome: formatRupiahCompact(item.income),
      formattedExpense: formatRupiahCompact(item.expense),
    }));
  }, [yearlyTrend]);

  // Calculate max value for Y axis scaling
  const maxValue = useMemo(() => {
    const allValues = chartData.flatMap((d) => [d.income, d.expense]);
    return Math.max(...allValues, 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200"></div>
            <div className="h-3 w-20 rounded bg-gray-200"></div>
          </div>
          <div className="mt-4 h-48 w-full overflow-x-auto">
            <div className="h-48 min-w-[600px] rounded bg-gray-100"></div>
          </div>
          <div className="mt-3 flex justify-center gap-4">
            <div className="h-3 w-20 rounded bg-gray-200"></div>
            <div className="h-3 w-24 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" aria-label="Tren 12 bulan">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Tren 12 Bulan</h3>
        <span className="text-xs text-gray-500"> dalam Rupiah</span>
      </div>

      {/* Chart container with horizontal scroll */}
      <div className="mt-4 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[600px]">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barCategoryGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value.toString();
                }}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={{ stroke: "#e5e7eb" }}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value) =>
                  value === "income" ? "Pemasukan" : "Pengeluaran"
                }
              />
              <Bar
                dataKey="income"
                name="income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-3 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Pemasukan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Pengeluaran</span>
        </div>
      </div>
    </div>
  );
}
