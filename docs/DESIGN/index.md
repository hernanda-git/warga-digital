# Warga Digital - Design System

> **AI Context**: This is a mobile-first Next.js app ( warga-digital ) using Tailwind CSS, NextUI, and Supabase. The design system provides consistent styling through CSS variables and Tailwind utilities.

---

## 📁 Documentation Structure

```
docs/DESIGN/
├── index.md              ← You are here (overview)
├── COLORS.md             - Color palette and CSS variables
├── TYPOGRAPHY.md         - Font families and text styles
├── COMPONENTS.md         - UI components reference
├── LAYOUT.md             - Spacing, layout tokens
└── BEST_PRACTICES.md     - Usage guidelines
```

---

## 🎨 Quick Reference

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#43a047` | CTAs, links, active states |
| `--color-primary-hover` | `#2e7d32` | Button hover states |
| `--color-surface` | `#ffffff` | Card backgrounds |
| `--color-surface-alt` | `#f2faf3` | Alternate surfaces |
| `--color-title` | `#1f5d24` | Headlines |
| `--color-body` | `#3f4b42` | Body text |
| `--color-body-muted` | `#6f7d72` | Secondary text |

### Font Families

| Usage | Font | Weight |
|-------|------|--------|
| Headlines | Manrope | 400, 600, 700, 800 |
| Body / Labels | Inter | 400, 500, 600 |

### Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--app-max-width` | `430px` | Mobile-first max width |
| `--app-height` | `100dvh` | Full viewport height |

---

## 🚀 Getting Started

### 1. Using Design Tokens in CSS

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-body);
}

.my-button {
  background-color: var(--color-primary);
  color: white;
}
```

### 2. Using Tailwind Classes

```tsx
<div className="bg-app-surface text-app-body">
  <h1 className="font-headline text-app-title">Hello</h1>
  <button className="bg-app-primary text-white">Click Me</button>
</div>
```

### 3. Using UI Components

```tsx
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Avatar } from "@/components/ui/Avatar";
import { PageScreen } from "@/components/ui/PageScreen";

<PrimaryButton onPress={() => {}}>
  Next
</PrimaryButton>

<Avatar name="John Doe" src="/avatar.jpg" size={40} />

<PageScreen header={<Header />}>
  <Content />
</PageScreen>
```

---

## 🏗️ Project Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + NextUI
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **State**: React hooks (useState, useEffect, useCallback)

### Key Files
| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS variables & design tokens |
| `tailwind.config.ts` | Tailwind configuration |
| `src/components/ui/*.tsx` | Reusable UI components |
| `src/app/*/page.tsx` | Route pages |

### Design Token Sources
- **Primary tokens**: `src/app/globals.css` (lines 10-50)
- **Tailwind mapping**: `tailwind.config.ts` (colors.app)
- **NextUI mapping**: `tailwind.config.ts` (nextui plugin)

---

## 📋 File Overview

### [COLORS.md](COLORS.md)
Complete color palette with CSS variables, dark mode support, and usage guidelines.

- Primary palette (green tones)
- Surface colors
- Typography colors
- Legacy aliases
- Dark mode considerations

### [TYPOGRAPHY.md](TYPOGRAPHY.md)
Font system documentation including:

- Font family definitions (Manrope, Inter)
- Font weight guidelines
- Material Symbols for icons
- Text utility classes

### [COMPONENTS.md](COMPONENTS.md)
Reusable UI components:

- PrimaryButton
- SecondaryButton
- Avatar
- PageScreen
- DotIndicators
- PageLoader

### [LAYOUT.md](LAYOUT.md)
Layout and spacing system:

- Max-width containers
- Safe area insets
- Spacing scale
- Responsive considerations

### [BEST_PRACTICES.md](BEST_PRACTICES.md)
Guidelines for consistent UI:

- When to use each component
- Accessibility considerations
- Animation guidelines
- Common patterns

---

## 🔧 Related Documentation

- [Theme System](../theme-system/THEME_DOCUMENTATION_INDEX.md) - 15-theme color system
- [Component Library](../COMPONENTS.md) - NextUI integration
- [Tailwind Config](../tailwind.config.ts) - Tailwind configuration

---

## 📝 Contributing

When adding new UI elements:

1. Follow the design tokens in `globals.css`
2. Use Tailwind classes with design token references
3. Document new components in [COMPONENTS.md](COMPONENTS.md)
4. Update this index if adding new files

---

**Last Updated**: 2026-04-09  
**Project**: Warga Digital  
**Status**: Active Development
