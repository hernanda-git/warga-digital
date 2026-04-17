# Typography

> **AI Context**: Font families are imported via Google Fonts in `src/app/globals.css`. The app uses Manrope for headlines and Inter for body text. Material Symbols are used for icons via the `material-symbols-outlined` class.

---

## Font Families

The app uses two font families:

| Usage | Font | Weights | Import |
|-------|------|---------|--------|
| Headlines | Manrope | 400, 600, 700, 800 | Google Fonts |
| Body / Labels | Inter | 400, 500, 600 | Google Fonts |
| Icons | Material Symbols Outlined | 100-700 | Google Fonts |

---

## Import

Fonts are imported in `globals.css` (lines 1-2):

```css
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
```

**Source File**: `src/app/globals.css`

---

## Font Classes

Defined in `globals.css`:

```css
.font-headline {
  font-family: "Manrope", sans-serif;
}

.font-body {
  font-family: "Inter", sans-serif;
}

.font-label {
  font-family: "Inter", sans-serif;
}
```

---

## Tailwind Configuration

In `tailwind.config.ts`:

```ts
fontFamily: {
  headline: ["Manrope"],
  body: ["Inter"],
  label: ["Inter"],
},
```

---

## Usage in Components

### Headlines

```tsx
<h1 className="font-headline font-bold text-app-title">
  Welcome
</h1>

<h2 className="font-headline font-semibold text-app-title">
  Section Title
</h2>
```

### Body Text

```tsx
<p className="font-body text-app-body">
  Body paragraph text
</p>

<span className="font-label text-app-body-muted">
  Caption text
</span>
```

---

## Material Symbols (Icons)

The app uses Material Symbols Outlined for icons.

**CSS Setup** (`globals.css` line 193+):

```css
.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}
```

### Usage with Heroicons (Recommended)

```tsx
import { XMarkIcon } from "@heroicons/react/24/outline";

<XMarkIcon className="w-5 h-5" />
```

### Direct Usage

```tsx
// Outlined icon (default)
<span className="material-symbols-outlined">home</span>

// Filled icon
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>

// Different weights
<span className="material-symbols-outlined" style={{ fontWeight: 300 }}>home</span>
```

---

## Font Weights

| Weight | Tailwind | Value | Usage |
|--------|----------|-------|-------|
| Regular | `font-normal` | 400 | Body text, labels |
| Medium | `font-medium` | 500 | Emphasized labels |
| Semibold | `font-semibold` | 600 | Headlines, buttons |
| Bold | `font-bold` | 700 | Primary headlines |
| Extra Bold | `font-extrabold` | 800 | Hero sections |

---

## Tailwind Typography Classes

| Class | Font Family | Usage |
|-------|--------------|-------|
| `font-headline` | Manrope | Headlines |
| `font-body` | Inter | Body text |
| `font-label` | Inter | Labels, captions |

### Text Sizes

| Tailwind Class | Size | Usage |
|----------------|------|-------|
| `text-xs` | 0.75rem | Captions, timestamps |
| `text-sm` | 0.875rem | Labels, small text |
| `text-base` | 1rem | Body text |
| `text-lg` | 1.125rem | Emphasized body |
| `text-xl` | 1.25rem | Section titles |
| `text-2xl` | 1.5rem | Page titles |
| `text-3xl` | 1.875rem | Hero headlines |

### Common Combinations

```tsx
// Page title
<h1 className="font-headline font-bold text-2xl text-app-title">
  Title
</h1>

// Section header
<h2 className="font-headline font-semibold text-xl text-app-title">
  Section
</h2>

// Body paragraph
<p className="font-body text-base text-app-body">
  Paragraph text
</p>

// Label / caption
<span className="font-label text-sm text-app-body-muted">
  Caption
</span>

// Button text
<button className="font-body font-semibold text-base">
  Button
</span>
```

---

## Related Files

- [`src/app/globals.css`](../../src/app/globals.css) - Font imports
- [`tailwind.config.ts`](../../tailwind.config.ts) - Font configuration
- [BEST_PRACTICES.md](BEST_PRACTICES.md) - Typography guidelines

---

**Last Updated**: 2026-04-09
