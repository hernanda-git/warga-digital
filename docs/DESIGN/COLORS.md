# Design Colors

> **AI Context**: Color tokens are defined as CSS custom properties in `src/app/globals.css` and exposed as Tailwind utilities in `tailwind.config.ts`. Use these tokens for all UI styling to maintain consistency.

---

## Overview

The color system uses CSS custom properties defined in `src/app/globals.css`. These tokens are used throughout the app for consistent theming.

**Source Files:**
- `src/app/globals.css` (lines 10-50) - Primary definition
- `tailwind.config.ts` - Tailwind class mapping

---

## Primary Palette

Primary colors are green-based, used for CTAs, links, and active states.

```css
:root {
  /* Main primary color - green */
  --color-primary: #43a047;
  
  /* Hover state (darker green) */
  --color-primary-hover: #2e7d32;
  
  /* Muted version for backgrounds */
  --color-primary-muted: #d5ead7;
  
  /* Primary shadow for buttons */
  --color-primary-shadow: rgba(67, 160, 71, 0.75);
}
```

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| `--color-primary` | `#43a047` | `bg-app-primary` | Buttons, links, active indicators |
| `--color-primary-hover` | `#2e7d32` | `bg-app-primary-hover` | Button hover states |
| `--color-primary-muted` | `#d5ead7` | `bg-app-primary-muted` | Backgrounds, disabled states |
| `--color-primary-shadow` | `rgba(67,160,71,0.75)` | - | Button shadows |

---

## Surface Colors

```css
:root {
  /* Main surface */
  --color-surface: #ffffff;
  
  /* Alternate surface (slight green tint) */
  --color-surface-alt: #f2faf3;
  
  /* Surface gradient colors */
  --color-surface-gradient-start: #7bc67f;
  --color-surface-gradient-mid: #a2d8a5;
  --color-surface-gradient-end: #d5ead7;
}
```

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| `--color-surface` | `#ffffff` | `bg-app-surface` | Card backgrounds, inputs |
| `--color-surface-alt` | `#f2faf3` | `bg-app-surface-alt` | Page backgrounds, sections |

---

## Typography Colors

```css
:root {
  /* Titles and headings */
  --color-title: #1f5d24;
  
  /* Body text */
  --color-body: #3f4b42;
  
  /* Muted / secondary text */
  --color-body-muted: #6f7d72;
}
```

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| `--color-title` | `#1f5d24` | `text-app-title` | Headlines, titles |
| `--color-body` | `#3f4b42` | `text-app-body` | Body text, paragraphs |
| `--color-body-muted` | `#6f7d72` | `text-app-body-muted` | Captions, hints, timestamps |

---

## Indicators & Progress

```css
:root {
  /* Active indicator (filled) */
  --color-indicator-active: #43a047;
  
  /* Inactive indicator (empty) */
  --color-indicator-inactive: #d5ead7;
}
```

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-indicator-active` | `#43a047` | Active dot/slider |
| `--color-indicator-inactive` | `#d5ead7` | Inactive dot/slider |

---

## Background Gradient

```css
:root {
  /* Page background gradient */
  --color-bg-gradient-start: #f8fdf9;
  --color-bg-gradient-end: #f3faf5;
  
  /* Input border */
  --color-input-border: #e5efe7;
}
```

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-gradient-start` | `#f8fdf9` | Gradient start |
| `--color-bg-gradient-end` | `#f3faf5` | Gradient end |
| `--color-input-border` | `#e5efe7` | Input borders |

---

## Legacy Aliases

These aliases are maintained for backward compatibility with older components (onboarding).

```css
:root {
  --onboarding-bg: var(--color-surface-alt);
  --onboarding-card: var(--color-surface);
  --onboarding-title: var(--color-title);
  --onboarding-body: var(--color-body);
  --onboarding-accent: var(--color-primary);
  --onboarding-accent-dark: var(--color-primary-hover);
  --onboarding-indicator-active: var(--color-indicator-active);
  --onboarding-indicator-inactive: var(--color-indicator-inactive);
}
```

**Note**: Prefer using the new tokens above for new development. Use `grep -r "onboarding-"` to find legacy usage.

---

## Tailwind Usage

The design tokens are also available as Tailwind utilities:

```tsx
// Using app-* prefix
<div className="bg-app-primary text-app-title">
  Content
</div>
```

| Tailwind Class | CSS Variable | Hex |
|----------------|--------------|-----|
| `bg-app-primary` | `--color-primary` | `#43a047` |
| `bg-app-primary-hover` | `--color-primary-hover` | `#2e7d32` |
| `bg-app-surface` | `--color-surface` | `#ffffff` |
| `bg-app-surface-alt` | `--color-surface-alt` | `#f2faf3` |
| `text-app-title` | `--color-title` | `#1f5d24` |
| `text-app-body` | `--color-body` | `#3f4b42` |
| `text-app-body-muted` | `--color-body-muted` | `#6f7d72` |

---

## Material Design 3 Colors

For advanced usage, the app also includes Material Design 3 color tokens:

```css
surface: #f6faf7
primary: #006b1b
secondary: #2d6b30
tertiary: #256931
error: #ba1a1a
on-surface: #181d1b
on-surface-variant: #3f4a3d
outline: #6f7a6b
/* ... and more */
```

These are defined in `tailwind.config.ts` but are used primarily by NextUI components.

---

## Dark Mode

Dark mode uses CSS `class="dark"` on the root element.

```css
.dark {
  /* Surface colors invert */
  --color-surface: #1a1a1a;
  --color-surface-alt: #242424;
  
  /* Text colors lighten */
  --color-title: #f0fdf4;
  --color-body: #dcfce7;
  --color-body-muted: #86efac;
}
```

**Note**: Dark mode implementation is planned but not yet fully deployed.

---

## Usage Examples

### Button Colors
```tsx
// Primary button
<button className="bg-app-primary hover:bg-app-primary-hover text-white">
  Submit
</button>

// Secondary button (custom)
<button className="border border-emerald-100 bg-emerald-50 text-emerald-700">
  Cancel
</button>
```

### Text Colors
```tsx
// Title
<h1 className="text-app-title font-headline">Welcome</h1>

// Body
<p className="text-app-body">This is body text.</p>

// Muted
<p className="text-app-body-muted">Last updated: 2 hours ago</p>
```

### Surface Colors
```tsx
// Card
<div className="bg-app-surface rounded-xl p-4">
  Card content
</div>

// Page background (gradient)
<div className="bg-gradient-to-b from-[var(--color-bg-gradient-start)] to-[var(--color-bg-gradient-end)]">
  Page content
</div>
```

---

## Related Files

- [`src/app/globals.css`](../../src/app/globals.css) - Where tokens are defined
- [`tailwind.config.ts`](../../tailwind.config.ts) - Tailwind color configuration
- [BEST_PRACTICES.md](BEST_PRACTICES.md) - Color usage guidelines

---

**Last Updated**: 2026-04-09
