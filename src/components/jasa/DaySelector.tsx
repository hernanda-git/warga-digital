"use client";

interface DaySelectorProps {
  value: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
  disabled?: boolean;
}

const DAYS = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
  { key: "sabtu", label: "Sabtu" },
  { key: "minggu", label: "Minggu" },
  { key: "tanggal_merah", label: "Tanggal Merah" },
];

const DEFAULT_VALUES: Record<string, boolean> = {
  senin: true,
  selasa: true,
  rabu: true,
  kamis: true,
  jumat: true,
  sabtu: true,
  minggu: false,
  tanggal_merah: false,
};

/**
 * DaySelector - Checkbox group for selecting operating days
 *
 * Used in Jasa service creation/editing form.
 * Shows 8 checkboxes with Indonesian day names.
 * Default: all weekdays true, weekends false, tanggal_merah false.
 */
export function DaySelector({
  value,
  onChange,
  disabled = false,
}: DaySelectorProps) {
  // Merge with defaults for any missing keys
  const mergedValue = { ...DEFAULT_VALUES, ...value };

  const handleToggle = (day: string) => {
    if (disabled) return;
    const newValue = {
      ...mergedValue,
      [day]: !mergedValue[day],
    };
    onChange(newValue);
  };

  const setAllWeekdays = () => {
    if (disabled) return;
    const newValue = { ...mergedValue };
    ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"].forEach((day) => {
      newValue[day] = true;
    });
    onChange(newValue);
  };

  const clearAll = () => {
    if (disabled) return;
    const newValue = { ...mergedValue };
    Object.keys(newValue).forEach((key) => {
      newValue[key] = false;
    });
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-app-title">
          Hari Operasional
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={setAllWeekdays}
            disabled={disabled}
            className="text-xs hover:underline disabled:opacity-50"
            style={{ color: "var(--color-primary)" }}
          >
            Semua Hari
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs text-app-body-muted hover:underline disabled:opacity-50"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DAYS.map(({ key, label }) => (
          <label
            key={key}
            className={`flex items-center gap-2 rounded-xl border p-3 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={
              mergedValue[key]
                ? {
                    borderColor: "var(--color-primary)",
                    background:
                      "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
                  }
                : {
                    borderColor: "var(--color-input-border)",
                    background: "var(--color-surface)",
                  }
            }
          >
            <input
              type="checkbox"
              checked={mergedValue[key]}
              onChange={() => handleToggle(key)}
              disabled={disabled}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-app-body">{label}</span>
          </label>
        ))}
      </div>

      {/* Quick summary */}
      <p className="text-xs text-app-body-muted">
        {Object.values(mergedValue).filter(Boolean).length === 0
          ? "Tidak beroperasi"
          : `Beroperasi: ${DAYS.filter((d) => mergedValue[d.key])
              .map((d) => d.label)
              .join(", ")}`}
      </p>
    </div>
  );
}
