# UI Components

> **AI Context**: Reusable UI components located in `src/components/ui/`. These components use design tokens from `globals.css` and follow the app's design system. Import from `@/components/ui/[ComponentName]`.

---

## Overview

The app provides a set of reusable UI components in `src/components/ui/`. These components follow the design system and use design tokens.

**Source Location**: `src/components/ui/*.tsx`

---

## Button Components

### PrimaryButton

Primary CTA button for main actions like "Next", "Submit", "Verify".

**Source**: `src/components/ui/PrimaryButton.tsx`

```tsx
import { PrimaryButton } from "@/components/ui/PrimaryButton";

<PrimaryButton onPress={() => {}}>
  Continue
</PrimaryButton>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Button text |
| `onPress` | `() => void` | `undefined` | Click handler |
| `type` | `"button" \| "submit"` | `"button"` | Button type |
| `isLoading` | `boolean` | `false` | Show loading spinner |
| `isDisabled` | `boolean` | `false` | Disable button |
| `className` | `string` | `""` | Additional classes |

**Implementation Details:**
- Uses NextUI `Button` component
- Styled with `bg-app-primary`, `hover:bg-app-primary-hover`
- Full-width with `rounded-2xl`
- Box shadow: `0 8px 22px -12px var(--color-primary-shadow)`
- Hover animation: `-translate-y-[1px]`
- Focus state: `focus-visible:ring-app-primary/30`

**Common Usage:**
```tsx
<PrimaryButton 
  onPress={handleSubmit}
  isLoading={isSubmitting}
  isDisabled={!isValid}
>
  Submit
</PrimaryButton>
```

---

### SecondaryButton

Secondary action button for "Skip", "Cancel", "Resend".

**Source**: `src/components/ui/SecondaryButton.tsx`

```tsx
import { SecondaryButton } from "@/components/ui/SecondaryButton";

<SecondaryButton onClick={() => {}}>
  Skip
</SecondaryButton>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Button text |
| `onClick` | `() => void` | `undefined` | Click handler |
| `type` | `"button" \| "submit"` | `"button"` | Button type |
| `disabled` | `boolean` | `false` | Disable button |
| `className` | `string` | `""` | Additional classes |

**Implementation Details:**
- Native `<button>` (not NextUI)
- Pill style: `rounded-full`
- Green border: `border-emerald-100`
- Muted background: `bg-emerald-50/70`
- Text: `text-emerald-700`
- Shadow: `shadow-emerald-100/50`

---

## Layout Components

### PageScreen

Full-height screen layout with header, content, and footer areas.

**Source**: `src/components/ui/PageScreen.tsx`

```tsx
import { PageScreen } from "@/components/ui/PageScreen";

<PageScreen 
  header={<BrandLogo />}
  footer={<PrimaryButton>Next</PrimaryButton>}
>
  <Form />
</PageScreen>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Main content |
| `header` | `ReactNode` | `undefined` | Top bar |
| `footer` | `ReactNode` | `undefined` | Bottom bar |
| `className` | `string` | `""` | Additional classes |

**Implementation Details:**
- Flex container: `flex h-full w-full min-h-0 flex-col`
- Padding: `px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]`
- Background: `bg-app-surface`
- Header: `shrink-0`, `py-2`
- Content: `flex-1 min-h-0`, `justify-center`, `py-2`
- Footer: `shrink-0`, `gap-4`, `pt-4`

**Flex Layout Structure:**
```tsx
<div className="flex h-full w-full min-h-0 flex-col">
  <div className="shrink-0">{header}</div>
  <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
  <div className="shrink-0">{footer}</div>
</div>
```

---

## Display Components

### Avatar

User avatar with image or initials fallback.

**Source**: `src/components/ui/Avatar.tsx`

```tsx
import { Avatar } from "@/components/ui/Avatar";

// With image
<Avatar name="John Doe" src="/avatar.jpg" size={40} />

// With initials (no image)
<Avatar name="John Doe" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Display name (for initials) |
| `src` | `string \| null` | `undefined` | Image URL |
| `size` | `number` | `40` | Size in pixels |
| `className` | `string` | `""` | Additional classes |
| `alt` | `string` | `name` | Alt text |

**Implementation Details:**
- Rounded full: `rounded-full`
- Background: `bg-app-primary/15` (15% opacity)
- Text: `text-app-primary`
- Uses Next.js `<Image>` with `unoptimized` and `referrerPolicy="no-referrer"`

**Initials Generation:**
```ts
function getInitials(name: string): string {
  // "John Doe" → "JD"
  // "John" → "J"
  // "" → "?"
}
```

**Size Classes:**
| Size | Class |
|------|-------|
| ≤24px | `text-xs` |
| ≤32px | `text-sm` |
| ≤48px | `text-base` |
| >48px | `text-xl` |

---

### DotIndicators

Dot indicators for slides/onboarding.

**Source**: `src/components/ui/DotIndicators.tsx`

```tsx
import { DotIndicators } from "@/components/ui/DotIndicators";

<DotIndicators 
  count={3} 
  current={1} 
  activeColor="bg-app-primary" 
/>
```

---

### PageLoader

Loading spinner for page transitions.

**Source**: `src/components/ui/PageLoader.tsx`

```tsx
import { PageLoader } from "@/components/ui/PageLoader";

<PageLoader />
```

---

## Best Practices

### When to Use PrimaryButton vs SecondaryButton

| Action | Button Type |
|--------|-------------|
| Continue, Submit, Next, Verify, Login, Register | PrimaryButton |
| Skip, Cancel, Back, Resend | SecondaryButton |

### Button Loading States

```tsx
const [loading, setLoading] = useState(false);

<PrimaryButton 
  isLoading={loading}
  onPress={async () => {
    setLoading(true);
    await doAction();
    setLoading(false);
  }}
>
  Submit
</PrimaryButton>
```

### Avatar Sizing

| Size | Usage |
|------|-------|
| 24-32px | Small avatars (list items) |
| 40px | Default (cards, headers) |
| 48px+ | Large (profile, hero) |

---

## Component Import Paths

```tsx
// Buttons
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

// Layout
import { PageScreen } from "@/components/ui/PageScreen";

// Display
import { Avatar } from "@/components/ui/Avatar";
import { DotIndicators } from "@/components/ui/DotIndicators";
import { PageLoader } from "@/components/ui/PageLoader";
```

---

## Related Files

- [`src/components/ui/PrimaryButton.tsx`](../../src/components/ui/PrimaryButton.tsx)
- [`src/components/ui/SecondaryButton.tsx`](../../src/components/ui/SecondaryButton.tsx)
- [`src/components/ui/Avatar.tsx`](../../src/components/ui/Avatar.tsx)
- [`src/components/ui/PageScreen.tsx`](../../src/components/ui/PageScreen.tsx)
- [COLORS.md](COLORS.md) - Button colors
- [TYPOGRAPHY.md](TYPOGRAPHY.md) - Font styles

---

**Last Updated**: 2026-04-09
