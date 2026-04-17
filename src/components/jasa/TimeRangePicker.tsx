"use client";

import { useState, useEffect } from "react";

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
  disabled?: boolean;
}

/**
 * TimeRangePicker - Component for selecting operating hours
 *
 * Provides two time inputs with validation that start < end.
 * Default: 08:00 - 17:00
 * Uses native HTML time input for mobile-friendly picker.
 */
export function TimeRangePicker({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  disabled = false,
}: TimeRangePickerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate whenever times change
    if (startTime && endTime) {
      if (startTime >= endTime) {
        setError("Jam mulai harus sebelum jam selesai");
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [startTime, endTime]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    onStartChange(newStart);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    onEndChange(newEnd);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-app-title">
        Jam Operasional
      </label>

      <div className="flex items-center gap-3">
        {/* Start Time */}
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-app-body-muted">
            Mulai
          </label>
          <input
            type="time"
            value={startTime}
            onChange={handleStartChange}
            disabled={disabled}
            className="w-full rounded-xl border border-gray-200 bg-app-surface px-3 py-2.5 text-sm text-app-body focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Separator */}
        <div className="pt-6 text-app-body-muted">-</div>

        {/* End Time */}
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-app-body-muted">
            Selesai
          </label>
          <input
            type="time"
            value={endTime}
            onChange={handleEndChange}
            disabled={disabled}
            className="w-full rounded-xl border border-gray-200 bg-app-surface px-3 py-2.5 text-sm text-app-body focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onStartChange("08:00");
            onEndChange("12:00");
          }}
          disabled={disabled}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-app-body hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pagi (08:00-12:00)
        </button>
        <button
          type="button"
          onClick={() => {
            onStartChange("13:00");
            onEndChange("17:00");
          }}
          disabled={disabled}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-app-body hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siang (13:00-17:00)
        </button>
        <button
          type="button"
          onClick={() => {
            onStartChange("08:00");
            onEndChange("17:00");
          }}
          disabled={disabled}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Full Day (08:00-17:00)
        </button>
      </div>
    </div>
  );
}
