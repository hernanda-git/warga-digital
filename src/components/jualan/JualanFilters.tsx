"use client";

interface JualanFiltersProps {
  categories: Array<{ id: string; name: string; icon: string | null }>;
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  minPrice: number | null;
  onMinPriceChange: (price: number | null) => void;
  maxPrice: number | null;
  onMaxPriceChange: (price: number | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function JualanFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortChange,
}: JualanFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Cari barang..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-app-input-border bg-app-surface px-4 pr-10 text-sm text-app-body placeholder-app-body-muted outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
          style={{
            borderRadius: "14px",
          }}
        />
        <svg
          className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-app-body-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide lg:flex-wrap">
        <button
          onClick={() => onCategoryChange(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            selectedCategory === null
              ? "bg-app-primary text-white"
              : "bg-app-surface text-app-body"
          }`}
          style={{
            border:
              selectedCategory === null
                ? "none"
                : "1px solid var(--color-input-border)",
          }}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedCategory === category.id
                ? "bg-app-primary text-white"
                : "bg-app-surface text-app-body"
            }`}
            style={{
              border:
                selectedCategory === category.id
                  ? "none"
                  : "1px solid var(--color-input-border)",
            }}
          >
            {category.icon || "📦"} {category.name}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-app-body-muted">
            Harga Min
          </label>
          <input
            type="number"
            placeholder="0"
            value={minPrice ?? ""}
            onChange={(e) =>
              onMinPriceChange(e.target.value ? parseInt(e.target.value) : null)
            }
            className="h-10 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-app-body-muted">
            Harga Max
          </label>
          <input
            type="number"
            placeholder="1000000"
            value={maxPrice ?? ""}
            onChange={(e) =>
              onMaxPriceChange(e.target.value ? parseInt(e.target.value) : null)
            }
            className="h-10 w-full rounded-xl border border-app-input-border bg-app-surface px-3 text-sm text-app-body outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-app-body-muted">
          Urutkan
        </label>
        <div className="flex gap-2">
          {[
            { value: "newest", label: "Terbaru" },
            { value: "price-asc", label: "Termurah" },
            { value: "price-desc", label: "Termahal" },
            { value: "best-selling", label: "Terlaris" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                sortBy === option.value
                  ? "bg-app-primary text-white"
                  : "bg-app-surface text-app-body"
              }`}
              style={{
                border:
                  sortBy === option.value
                    ? "none"
                    : "1px solid var(--color-input-border)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
