# Layout

> **AI Context**: The app uses a mobile-first design with max-width 430px. Layout tokens are CSS custom properties in `globals.css`. Safe area insets handle notched mobile devices.

---

## Layout Tokens

The app uses mobile-first design with a maximum width constraint.

```css
:root {
  /* Mobile-first max width */
  --app-max-width: 430px;
  
  /* Full viewport height */
  --app-height: 100dvh;
}
```

**Source**: `src/app/globals.css` (lines 9-10)

---

## Page Layout

### Full Screen Container

Use `PageScreen` component or apply these styles:

```css
.page-container {
  height: 100%;
  width: 100%;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}
```

### Flex Layout Pattern

The standard app layout pattern:

```tsx
<div className="flex h-full w-full min-h-0 flex-col">
  {/* Header - shrink-0 prevents compression */}
  <div className="shrink-0">Header</div>
  
  {/* Scrollable Content - flex-1 fills space, min-h-0 enables scroll */}
  <div className="flex min-h-0 flex-1 flex-col">
    Content
  </div>
  
  {/* Footer - shrink-0 prevents compression */}
  <div className="shrink-0">Footer</div>
</div>
```

**Key Classes:**
| Class | Purpose |
|-------|----------|
| `flex h-full` | Full height flex container |
| `flex-col` | Vertical stacking |
| `flex-1` | Fill available space |
| `shrink-0` | Don't shrink |
| `min-h-0` | Enable vertical scroll |

---

## Spacing Scale

Based on Tailwind's default spacing (1rem = 16px):

| Tailwind | Value | Pixels | Usage |
|----------|-------|--------|-------|
| `px-1` | 0.25rem | 4px | Tight spacing |
| `px-2` | 0.5rem | 8px | Small gaps |
| `px-4` | 1rem | 16px | Default padding |
| `px-6` | 1.5rem | 24px | Page padding |
| `py-1` | 0.25rem | 4px | Tight vertical |
| `py-2` | 0.5rem | 8px | Vertical padding |
| `py-4` | 1rem | 16px | Section spacing |
| `gap-1` | 0.25rem | 4px | Tight gaps |
| `gap-2` | 0.5rem | 8px | Default gaps |
| `gap-4` | 1rem | 16px | Large gaps |
| `gap-6` | 1.5rem | 24px | Extra large gaps |

---

## Safe Area Insets

For mobile devices with notches (iPhone X+):

```css
/* Top safe area */
padding-top: max(1rem, env(safe-area-inset-top));

/* Bottom safe area */
padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
```

**Tailwind Syntax:**
```tsx
className="pt-[max(1rem,env(safe-area-inset-top))]"
className="pb-[max(1.5rem,env(safe-area-inset-bottom))]"
```

---

## Responsive Considerations

The app is designed for mobile (max-width 430px). For larger screens:

```css
@media (min-width: 431px) {
  .app-container {
    max-width: 430px;
    margin: 0 auto;
    border-left: 1px solid var(--color-input-border);
    border-right: 1px solid var(--color-input-border);
  }
}
```

---

## Common Layout Patterns

### Card Layout
```tsx
<div className="rounded-2xl bg-app-surface p-4 shadow-md">
  Card content
</div>
```

### List Item
```tsx
<div className="flex items-center gap-3 py-3 border-b border-[var(--color-input-border)]">
  <Icon />
  <div className="flex-1">Content</div>
  <Badge>Status</Badge>
</div>
```

### Centered Content
```tsx
<div className="flex min-h-0 flex-1 flex-col justify-center">
  {/* Content centered vertically */}
</div>
```

### Two-Column Layout
```tsx
<div className="flex gap-4">
  <div className="flex-1">Left</div>
  <div className="flex-1">Right</div>
</div>
```

---

## Tailwind Layout Classes Reference

| Class | CSS | Description |
|-------|-----|-------------|
| `flex` | `display: flex` | Flex container |
| `flex-col` | `flex-direction: column` | Vertical stacking |
| `flex-1` | `flex: 1 1 0%` | Fill available space |
| `flex-none` | `flex: none` | Don't grow or shrink |
| `shrink-0` | `flex-shrink: 0` | Don't shrink |
| `min-h-0` | `min-height: 0` | Enable vertical scroll |
| `items-center` | `align-items: center` | Center items vertically |
| `items-start` | `align-items: flex-start` | Align to top |
| `justify-center` | `justify-content: center` | Center content |
| `justify-between` | `justify-content: space-between` | Space between |
| `justify-end` | `justify-content: flex-end` | Align to end |
| `gap-2` | `gap: 0.5rem` | Gap between items |
| `w-full` | `width: 100%` | Full width |
| `h-full` | `height: 100%` | Full height |

---

## Page Screen Example (Full Implementation)

```tsx
import { PageScreen } from "@/components/ui/PageScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginPage() {
  return (
    <PageScreen
      header={
        <div className="flex items-center gap-2">
          <h1 className="font-headline font-bold text-xl text-app-title">
            Login
          </h1>
        </div>
      }
      footer={
        <PrimaryButton onPress={() => router.push("/home")}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-app-body">Welcome back!</p>
        <Form />
      </div>
    </PageScreen>
  );
}
```

---

## Related Files

- [`src/app/globals.css`](../../src/app/globals.css) - Layout tokens
- [`src/components/ui/PageScreen.tsx`](../../src/components/ui/PageScreen.tsx) - Layout component
- [COMPONENTS.md](COMPONENTS.md) - UI components

---

**Last Updated**: 2026-04-09
