# UI Components Reference

## Layout Components

### AppShell
**Location:** `src/components/app-shell.tsx`
**Purpose:** Main app wrapper with bottom navigation

```tsx
<AppShell>
  <PageContent />
</AppShell>
```

---

### PageLoader
**Location:** `src/components/ui/PageLoader.tsx`
**Purpose:** Full-page loading spinner

```tsx
<PageLoader message="Memuat..." />
```

**Props:**
- `message?: string` - Loading text (default: "Memuat...")

**Style:**
- Full viewport overlay
- Centered spinner
- Semi-transparent background
- Animated rotation

---

### PageScreen
**Location:** `src/components/ui/PageScreen.tsx`
**Purpose:** Loading wrapper for page content

```tsx
<PageScreen isLoading={loading}>
  <PageContent />
</PageScreen>
```

---

### Avatar
**Location:** `src/components/ui/Avatar.tsx`
**Purpose:** User avatar with initials fallback

```tsx
<Avatar name="John Doe" size={48} />
```

**Props:**
- `name: string` - User's full name
- `size?: number` - Avatar size in pixels (default: based on variant)
- `className?: string` - Additional CSS classes

**Behavior:**
- Shows profile picture if available
- Falls back to initials with primary background
- Circular shape

---

## Navigation Components

### BottomNav
**Location:** `src/components/nav/BottomNav.tsx`
**Purpose:** Fixed bottom navigation bar

**Structure:**
- 3-4 navigation items
- Active state highlighting
- Admin tab conditional display
- Safe area padding

---

### OtpInput
**Location:** `src/components/auth/otp-input.tsx`
**Purpose:** 4-digit PIN input

```tsx
<OtpInput
  value={pin}
  onChange={(v) => setPin(v)}
  length={4}
  disabled={loading}
  error={error}
  masked={true}
/>
```

**Props:**
- `value: string` - Current PIN value
- `onChange: (value: string) => void` - Change handler
- `length?: number` - Number of digits (default: 4)
- `disabled?: boolean` - Disabled state
- `error?: string` - Error message
- `masked?: boolean` - Show dots instead of numbers
- `autoFocus?: boolean` - Focus first input on mount

**Styling:**
- Individual input boxes
- Focus state per box
- Error state (red border)
- Disabled state (opacity)

---

## Landing Components

### LandingHeader
**Location:** `src/components/landing/LandingHeader.tsx`
**Purpose:** Home page header with profile and wallet

**Props:**
- `name: string` - User's full name
- `profilePictureUrl?: string` - Profile image URL
- `blokRumah: string` - House block
- `saldo: string` - Wallet balance formatted
- `notificationCount: number` - Unread notifications
- `onNotificationPress: () => void` - Notification click handler

---

### FeatureGrid
**Location:** `src/components/landing/FeatureGrid.tsx`
**Purpose:** Quick access tiles grid

**Features:**
- 3-column grid
- Icon + label tiles
- Links to various sections
- Hover/active states

---

### LandingSection
**Location:** `src/components/landing/LandingSection.tsx`
**Purpose:** Reusable section container

```tsx
<LandingSection title="Info Warga">
  <Content />
</LandingSection>
```

**Props:**
- `title?: string` - Section title
- `rightSlot?: ReactNode` - Right side content
- `children: ReactNode` - Section content

---

### HorizontalCardStrip
**Location:** `src/components/landing/HorizontalCardStrip.tsx`
**Purpose:** Horizontal scrolling card list

**Props:**
- `title?: string`
- `items: CardItem[]`
- `viewAllHref?: string`

---

### EmptyState
**Location:** `src/components/landing/empty-states/EmptyState.tsx`
**Purpose:** Empty state placeholder

**Variants:**
- `ANNOUNCEMENTS` - Megaphone icon
- `UMKM` - Shopping bag
- `JASA` - Wrench

---

## Kas RT Components

### KasRtHero
**Location:** `src/components/kas-rt/KasRtHero.tsx`
**Purpose:** RT fund header with stats

### KasRtFilterBar
**Location:** `src/components/kas-rt/KasRtFilterBar.tsx`
**Purpose:** Quick filter pills

### KasRtFilterSheet
**Location:** `src/components/kas-rt/KasRtFilterSheet.tsx`
**Purpose:** Advanced filter bottom sheet

### KasRtDownloadSheet
**Location:** `src/components/kas-rt/KasRtDownloadSheet.tsx`
**Purpose:** Report download options

### KasRtTransactionList
**Location:** `src/components/kas-rt/KasRtTransactionList.tsx`
**Purpose:** Transaction list with pull-to-refresh

### KasRtTransactionForm
**Location:** `src/components/kas-rt/KasRtTransactionForm.tsx`
**Purpose:** Add/edit transaction form

### KasRtDeleteConfirmDialog
**Location:** `src/components/kas-rt/KasRtDeleteConfirmDialog.tsx`
**Purpose:** Delete confirmation dialog

### KasRtDuplicateWarningDialog
**Location:** `src/components/kas-rt/KasRtDuplicateWarningDialog.tsx`
**Purpose:** Duplicate transaction warning

### KasRtTransactionListSkeleton
**Location:** `src/components/kas-rt/skeletons/index.tsx`
**Purpose:** Loading skeleton for transaction list

---

## Jasa Components

### JasaCard
**Location:** `src/components/jasa/JasaCard.tsx`
**Purpose:** Service listing card

**Props:**
- `service: JasaServiceWithMedia`
- `onClick?: () => void`
- `onContact?: () => void`

### JasaCardSkeleton
**Location:** `src/components/jasa/JasaCard.tsx`
**Purpose:** Loading skeleton for service card

### JasaFilters
**Location:** `src/components/jasa/JasaFilters.tsx`
**Purpose:** Search and filter controls

**Props:**
- `categories: Category[]`
- `selectedCategory: string | null`
- `onCategoryChange: (id: string | null) => void`
- `selectedDays: Record<string, boolean>`
- `onDaysChange: (days: Record<string, boolean>) => void`
- `selectedStatus: boolean | null`
- `onStatusChange: (status: boolean | null) => void`
- `searchQuery: string`
- `onSearchChange: (query: string) => void`
- `minPrice: number | null`
- `onMinPriceChange: (price: number | null) => void`
- `maxPrice: number | null`
- `onMaxPriceChange: (price: number | null) => void`

### JasaCreateModal
**Location:** `src/components/jasa/JasaCreateModal.tsx`
**Purpose:** Create new service modal

### JasaEditModal
**Location:** `src/components/jasa/JasaEditModal.tsx`
**Purpose:** Edit service modal

### JasaDetailModal
**Location:** `src/components/jasa/JasaDetailModal.tsx`
**Purpose:** Service detail view modal

---

## Onboarding Components

### OnboardingCarousel
**Location:** `src/components/onboarding/onboarding-carousel.tsx`
**Purpose:** Welcome slides carousel

---

## Auth Components

### PrimaryButton
**Location:** `src/components/ui/PrimaryButton.tsx`
**Purpose:** Main CTA button

**Props:**
- `children: ReactNode`
- `isLoading?: boolean`
- `disabled?: boolean`
- `onClick?: () => void`
- `type?: "button" | "submit"`
- `className?: string`

**Styling:**
- Primary background color
- White text
- Shadow
- Hover lift effect
- Disabled opacity

### SecondaryButton
**Location:** `src/components/ui/SecondaryButton.tsx`
**Purpose:** Secondary action button

**Styling:**
- Surface alt background
- Body text color
- No shadow

---

## Utility Components

### DotIndicators
**Location:** `src/components/ui/DotIndicators.tsx`
**Purpose:** Carousel/page indicators

```tsx
<DotIndicators count={3} activeIndex={0} />
```

---

## Hooks

### usePullToRefresh
**Location:** `src/lib/hooks/use-pull-to-refresh.ts`
**Purpose:** Pull-to-refresh gesture handling

```tsx
const { pullDistance, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh({
  onRefresh: refreshData,
  isRefreshing,
});
```

---

## Form Components

### Input (NextUI)
**Location:** `@nextui-org/react`

**InputClassNames:**
```typescript
const inputClassNames = {
  label: "text-app-body-muted text-[11px] font-bold uppercase tracking-widest",
  input: "text-sm font-semibold text-app-title",
  inputWrapper: "min-h-[52px] bg-white border-default-200",
};
```

---

## Modal/Sheet Patterns

### Bottom Sheet
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface">
    {/* Content */}
  </div>
</>
```

### Dialog
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6">
    {/* Content */}
  </div>
</>
```

---

## Animation Patterns

### Slide Up
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Fade In Up (Staggered)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Sheet Up
```css
@keyframes sheetUp {
  from { transform: translate(-50%, 100%); }
  to { transform: translate(-50%, 0); }
}
```

### Dialog In
```css
@keyframes dialogIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
```

---

## State Patterns

### Loading State
```tsx
const [loading, setLoading] = useState(false);
// During operation
setLoading(true);
try {
  await operation();
} finally {
  setLoading(false);
}
```

### Error State
```tsx
const [error, setError] = useState<string | null>(null);
// On error
setError("Error message");
// Display
{error && (
  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
    <p className="text-sm text-red-600">{error}</p>
  </div>
)}
```

### Optimistic Update
```tsx
const snapshot = currentState;
setCurrentState(newState);
try {
  await apiCall();
} catch {
  setCurrentState(snapshot);
}
```

---

## Responsive Patterns

### Mobile-First
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* 2 columns on mobile */}
</div>

@media (min-width: 640px) {
  /* Tablet+ adjustments if needed */
}
```

### Touch Targets
```tsx
<button className="min-h-[44px] min-w-[44px]">
  {/* Minimum 44px for touch */}
</button>
```
