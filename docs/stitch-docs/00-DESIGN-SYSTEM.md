# Design System - Warga Digital

## Overview
Mobile-first community app for **Sawangan Regenci RT 03**. Max width: **430px**, mobile app-like experience.

---

## Color Palette

### CSS Variables (in `globals.css`)

```css
:root {
  /* Layout */
  --app-max-width: 430px;
  --app-height: 100dvh;

  /* Primary palette (green – CTAs, links, active states) */
  --color-primary: #43a047;
  --color-primary-hover: #2e7d32;
  --color-primary-muted: #d5ead7;

  /* Surfaces */
  --color-surface: #ffffff;
  --color-surface-alt: #f2faf3;
  --color-surface-gradient-start: #7bc67f;
  --color-surface-gradient-mid: #a2d8a5;
  --color-surface-gradient-end: #d5ead7;

  /* Typography */
  --color-title: #1f5d24;
  --color-body: #3f4b42;
  --color-body-muted: #6f7d72;

  /* Indicators / progress */
  --color-indicator-active: #43a047;
  --color-indicator-inactive: #d5ead7;

  /* Body background gradient */
  --color-bg-gradient-start: #f8fdf9;
  --color-bg-gradient-end: #f3faf5;
  --color-input-border: #e5efe7;
  --color-primary-shadow: rgba(67, 160, 71, 0.75);
}
```

### Tailwind Color Extensions

```typescript
// tailwind.config.ts
colors: {
  app: {
    primary: "var(--color-primary)",
    "primary-hover": "var(--color-primary-hover)",
    "primary-muted": "var(--color-primary-muted)",
    surface: "var(--color-surface)",
    "surface-alt": "var(--color-surface-alt)",
    title: "var(--color-title)",
    body: "var(--color-body)",
    "body-muted": "var(--color-body-muted)",
    "indicator-active": "var(--color-indicator-active)",
    "indicator-inactive": "var(--color-indicator-inactive)",
  }
}
```

### 14 Theme Options

| Theme ID | Primary Color | Name |
|----------|--------------|------|
| `green` | `#43a047` | Hijau (Default) |
| `blue` | `#1976d2` | Biru |
| `purple` | `#7b1fa2` | Ungu |
| `orange` | `#e65100` | Oranye |
| `teal` | `#00897b` | Teal |
| `rose` | `#c2185b` | Merah Muda |
| `hitam` | `#1c1c1e` | Hitam |
| `red` | `#d32f2f` | Merah |
| `amber` | `#f57f17` | Kuning Emas |
| `cyan` | `#0097a7` | Sian |
| `indigo` | `#303f9f` | Indigo |
| `lime` | `#9ccc65` | Jeruk Lemon |
| `brown` | `#6d4c41` | Coklat |
| `deep-green` | `#1b5e20` | Hijau Gelap |
| `coral` | `#ff6f60` | Karang |

---

## Typography

### Font Families

```css
/* Google Fonts import */
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap");

/* Tailwind config */
fontFamily: {
  headline: ["Manrope"],
  body: ["Inter"],
  label: ["Inter"],
}
```

### Font Sizes Scale

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Display | `text-[24px]` | `font-extrabold` | Login hero title |
| H1 | `text-lg`/`text-xl` | `font-extrabold` | Page titles |
| H2 | `text-base`/`text-lg` | `font-bold` | Section titles |
| Body | `text-sm` | `font-semibold`/`normal` | Body text |
| Caption | `text-[11px]`/`text-[12px]` | `font-medium`/`semibold` | Captions |
| Label | `text-[10px]` | `font-bold uppercase tracking-widest` | Form labels |

---

## Spacing System

Uses Tailwind's default spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `px-4` | 16px | Page horizontal padding |
| `p-4` | 16px | Card padding |
| `p-5` | 20px | Large card padding |
| `gap-3` | 12px | Section gaps |
| `gap-4` | 16px | Component spacing |
| `py-5` | 20px | Vertical page padding |
| `pb-10` | 40px | Form bottom padding |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| DEFAULT | `0.25rem` (4px) | Small elements |
| lg | `0.5rem` (8px) | Medium elements |
| xl | `1.5rem` (24px) | Cards, modals |
| full | `9999px` | Pills, avatars |

### Custom Classes Used

- `rounded-2xl` = `rounded-[1rem]` - Standard card/button
- `rounded-3xl` = `rounded-[1.5rem]` - Hero sections
- `rounded-[2rem]` - Bottom sheets
- `rounded-[22px]` - Logo containers
- `rounded-[14px]` - Avatar containers

---

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)]` | Card shadow |
| `shadow-[0_4px_20px_rgba(0,40,5,0.08)]` | Large cards |
| `shadow-[0_-8px_40px_rgba(0,40,5,0.16)]` | Auth card |
| `shadow-[0_8px_22px_-12px_var(--color-primary-shadow)]` | Primary buttons |
| `shadow-[0_8px_24px_rgba(0,40,5,0.06)]` | Notification cards |
| `shadow-[0_16px_40px_-24px_rgba(79,70,229,0.65)]` | Wallet card |

---

## Components

### PrimaryButton
- Background: `var(--color-primary)`
- Text: white, `text-sm font-bold`
- Padding: `py-4 px-6`
- Border: `rounded-2xl`
- Shadow: `0 8px 22px -12px var(--color-primary-shadow)`
- Hover: `hover:-translate-y-[1px]`
- Active: `active:translate-y-0`
- Disabled: `opacity-50 cursor-not-allowed`

### SecondaryButton
- Background: `var(--color-surface-alt)`
- Text: `text-sm font-bold text-app-body`
- Border: `rounded-2xl`
- Hover: `hover:bg-app-surface`
- Active: `active:scale-[0.98]`

### Avatar
- Circular or rounded square
- Initials fallback with primary background
- Size variants: sm (32px), md (48px), lg (64px+)

### PageHero Section
- Gradient background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs (absolute positioned)
- Relative z-10 for content

### BottomSheet
- Background: `bg-app-surface`
- Border radius: `rounded-t-[2rem]`
- Max width: `var(--app-max-width)`
- Slide up animation
- Backdrop: `bg-black/50 backdrop-blur-sm`

### Input Fields
- Border: `rounded-2xl`
- Border color: `var(--color-input-border)`
- Padding: `px-4 py-3.5`
- Focus: green border + shadow
- Font: `text-sm font-semibold`

### Cards
- Background: `bg-app-surface`
- Border radius: `rounded-2xl` or `rounded-3xl`
- Padding: `p-4` or `p-5`
- Shadow: `shadow-[0_4px_20px_rgba(0,40,5,0.08)]`

### MetricPill
- Background: `bg-white/15` with backdrop blur
- Border radius: `rounded-2xl`
- Padding: `px-3 py-2.5`
- Label: `text-[9px] uppercase tracking-widest text-white/60`
- Value: `text-[15px] font-extrabold`

---

## Animations

```css
/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade in scale */
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Sheet up */
@keyframes sheetUp {
  from { transform: translate(-50%, 100%); }
  to { transform: translate(-50%, 0); }
}

/* Dialog in */
@keyframes dialogIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* Fade in up (staggered) */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Icon System
Uses Heroicons v2 with `Material Symbols Outlined` for some elements:
```css
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}
```

---

## Layout Structure

### App Shell
```
┌─────────────────────────────────────┐
│         max-width: 430px           │
│  ┌─────────────────────────────┐    │
│  │      Content Area          │    │
│  │   (scrollable, min-h-0)    │    │
│  │                             │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │      Bottom Navigation      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Page Structure
1. **Hero Section**: Gradient background, contains navigation, titles, metrics
2. **Content Area**: Scrollable, `min-h-0 flex-1 overflow-y-auto`
3. **Bottom Safe Area**: `pb-[env(safe-area-inset-bottom)]`

---

## Safe Area Support
```css
/* Top */
pt-[env(safe-area-inset-top)]

/* Bottom */
pb-[max(0.5rem,env(safe-area-inset-bottom))]
```

---

## Form Styles

### Labels
```css
text-[11px] font-bold uppercase tracking-widest text-app-body-muted
```

### Inputs (NextUI)
```css
[data-slot="input-wrapper"] {
  background-color: #ffffff !important;
  border: 1px solid var(--color-input-border);
  border-radius: 14px !important;
}

[data-slot="input-wrapper"]:has(input:focus) {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%) !important;
}
```

### Custom Inputs
```css
/* Regular */
w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-app-title

/* Focus state */
border-color: var(--color-primary)
box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)

/* Error state */
border-color: var(--color-red-500)
```

---

## Utility Classes

### Scrollbar Hide
```css
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
```

### Overscroll Control
```css
overflow-y-auto overscroll-contain
```

### Text Utilities
- `line-clamp-2`: Limit text to 2 lines
- `truncate`: Truncate with ellipsis
- `leading-relaxed`: Line height 1.625

---

## Responsive Strategy

This is a **mobile-first** design. The app:
- Constrains content to 430px max-width
- Centers content on larger screens
- Uses `dvh` for dynamic viewport height
- Supports safe areas for notched devices

---

## State Patterns

### Loading State
- Use `PageLoader` component
- Shows animated spinner
- Message: "Memuat..."

### Empty State
- Centered icon (muted color)
- Title: `text-sm font-medium text-app-body-muted`
- Description: `text-[11px] text-app-body-muted/60`

### Error State
- Border: `border-red-100`
- Background: `bg-red-50`
- Text: `text-sm text-red-600`

### Skeleton Loading
```css
.animate-pulse
.bg-app-surface-alt
```
