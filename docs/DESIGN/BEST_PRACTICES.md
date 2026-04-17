# Best Practices

> **AI Context**: Guidelines for writing consistent UI code in this Next.js app. Follow these patterns to maintain design system consistency and avoid common mistakes.

---

## Design Tokens Usage

### Always Use Design Tokens

✅ **Do:**
```tsx
<div className="bg-app-surface text-app-body">
  Content
</div>
```

❌ **Don't:**
```tsx
<div className="bg-white text-gray-700">
  Content
</div>
```

### When to Use Each Color

| Token | Use For | Avoid Using For |
|-------|---------|-----------------|
| `--color-primary` | Buttons, links, active tabs | Large backgrounds |
| `--color-primary-hover` | Button hover states only | Any other context |
| `--color-surface` | Cards, modals, inputs | Page backgrounds |
| `--color-surface-alt` | Page backgrounds | Cards |
| `--color-title` | Headlines, titles | Body text |
| `--color-body` | Paragraphs, body text | Captions |
| `--color-body-muted` | Captions, hints, timestamps | Headlines |

---

## Component Usage

### PrimaryButton

**Use for:** Main actions
- Next, Continue, Submit, Verify
- Login, Register, Sign Up
- Save, Create, Update
- Pay, Checkout

**Never use for:**
- Cancel, Back, Skip
- Secondary actions

```tsx
// ✅ Correct
<PrimaryButton onPress={handleSubmit}>Submit</PrimaryButton>

// ❌ Wrong
<PrimaryButton onPress={handleCancel}>Cancel</PrimaryButton>
```

---

### SecondaryButton

**Use for:** Secondary actions
- Skip, Cancel, Back
- Resend, Retry
- Edit (as secondary)
- Delete (as secondary)

**Never use for:**
- Primary actions

```tsx
// ✅ Correct
<SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>

// ❌ Wrong
<SecondaryButton onClick={handleSubmit}>Submit</SecondaryButton>
```

---

### Avatar

**Usage:**
- Always provide `name` prop for initials fallback
- Use Next.js `<Image>` (handled internally)
- Set `size` appropriate to context

```tsx
// ✅ With image
<Avatar name="John Doe" src="/avatar.jpg" size={40} />

// ✅ With initials only
<Avatar name="John Doe" />

// ❌ Missing name (will show "?")
<Avatar src="/avatar.jpg" />
```

---

### PageScreen

**Usage:**
- Use for full-page layouts (auth, onboarding)
- Include header for navigation/branding
- Include footer for primary action

```tsx
// ✅ Correct structure
<PageScreen
  header={<BackButton />}
  footer={<PrimaryButton>Next</PrimaryButton>}
>
  <Form />
</PageScreen>
```

---

## Typography

### Font Usage

| Element | Font | Weight | Tailwind |
|---------|------|--------|----------|
| H1 / Page Titles | Manrope | 700 | `font-headline font-bold` |
| H2 / Section Headers | Manrope | 600 | `font-headline font-semibold` |
| Body text | Inter | 400 | `font-body` |
| Labels | Inter | 500 | `font-label font-medium` |
| Captions | Inter | 400 | `font-label text-body-muted` |
| Buttons | Inter | 600 | `font-body font-semibold` |

### Text Colors

```tsx
// Headlines
<h1 className="text-app-title font-headline">Title</h1>

// Body
<p className="text-app-body font-body">Body text</p>

// Muted
<p className="text-app-body-muted font-label">Caption</p>
```

---

## Accessibility

### Focus States

All interactive elements must have visible focus states:

```tsx
// ✅ Has focus state
<button className="focus-visible:ring-2 focus-visible:ring-app-primary/30">
  Action
</button>

// ❌ No focus state
<button className="outline-none">Action</button>
```

### Touch Targets

- Minimum 44x44px touch target
- Use padding for comfortable tap areas
- PrimaryButton already meets this requirement

### Color Contrast

- Primary green (#43a047) on white: ✅ 4.5:1 ratio
- Body text (#3f4b42) on white: ✅ 7:1 ratio
- Muted text (#6f7d72) on white: ✅ 4.5:1 ratio

---

## Animation

### Transition Durations

Use 180ms for standard transitions:

```css
transition: all 180ms ease;
```

### When to Animate

| Animation | Class | When |
|-----------|-------|------|
| Button press | `active:translate-y-0` | On click |
| Hover lift | `hover:-translate-y-[1px]` | On hover |
| Card appear | Fade in + scale | On mount |
| Modal appear | Slide up | On open |

### Avoid Animating

- Background color on hover (too distracting)
- Large transforms (performance)
- Infinite animations (battery drain)

---

## Common Patterns

### Form Layout
```tsx
<div className="flex flex-col gap-4">
  <Input label="Email" />
  <Input label="Password" />
  <PrimaryButton>Login</PrimaryButton>
</div>
```

### List Item with Action
```tsx
<div className="flex items-center justify-between p-4 bg-app-surface rounded-xl">
  <div className="flex items-center gap-3">
    <Avatar name={user.name} src={user.avatar} />
    <div>
      <p className="font-semibold text-app-title">{user.name}</p>
      <p className="text-sm text-app-body-muted">{user.email}</p>
    </div>
  </div>
  <Button size="sm">Edit</Button>
</div>
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-8 text-center">
  <Icon className="w-12 h-12 text-app-body-muted" />
  <p className="mt-4 text-app-body">No items yet</p>
  <PrimaryButton className="mt-4">Add Item</PrimaryButton>
</div>
```

### Loading State
```tsx
<PrimaryButton isLoading={isLoading}>
  Submit
</PrimaryButton>
```

---

## Legacy Patterns to Avoid

| Old Pattern | Replace With | Example |
|-------------|--------------|----------|
| `--onboarding-*` tokens | `--color-*` tokens | `--onboarding-bg` → `--color-surface-alt` |
| `bg-white` | `bg-app-surface` | `bg-white` → `bg-app-surface` |
| `text-gray-500` | `text-app-body-muted` | `text-gray-500` → `text-app-body-muted` |
| `text-gray-800` | `text-app-title` | `text-gray-800` → `text-app-title` |
| Native `<button>` (styled) | PrimaryButton/SecondaryButton | Use component |
| Hardcoded hex colors | Design tokens | `#ffffff` → `var(--color-surface)` |

---

## Testing Checklist

Before submitting UI changes, verify:

- [ ] Colors use design tokens (not hardcoded hex)
- [ ] Fonts use correct families (Manrope/Inter)
- [ ] Buttons follow Primary/Secondary guidelines
- [ ] Focus states visible on interactive elements
- [ ] Touch targets ≥44px
- [ ] Safe area insets applied for mobile
- [ ] No animation on background colors
- [ ] Text has sufficient contrast

---

## Quick Reference

### Imports
```tsx
// Components
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Avatar } from "@/components/ui/Avatar";
import { PageScreen } from "@/components/ui/PageScreen";

// Colors (in CSS/Tailwind)
className="bg-app-primary text-app-title"
className="bg-app-surface text-app-body"
className="text-app-body-muted"

// Typography
className="font-headline"
className="font-body"
```

---

## Related Files

- [COLORS.md](COLORS.md) - Color tokens
- [TYPOGRAPHY.md](TYPOGRAPHY.md) - Font system
- [COMPONENTS.md](COMPONENTS.md) - UI components
- [LAYOUT.md](LAYOUT.md) - Spacing
- [`src/app/globals.css`](../../src/app/globals.css) - Design tokens

---

**Last Updated**: 2026-04-09
