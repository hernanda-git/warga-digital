# Warga Digital - Stitch Documentation Index

This documentation is designed to help Google Stitch generate code that precisely matches the existing Warga Digital application.

---

## Documentation Structure

```
stitch-docs/
├── 00-DESIGN-SYSTEM.md      # Core design tokens, colors, typography, spacing
├── 01-ONBOARDING.md         # Welcome carousel (3 screens)
├── 02-LOGIN.md              # 2-step login (username + PIN)
├── 03-REGISTER.md           # 3-step registration wizard
├── 04-LANDING.md            # Home dashboard
├── 05-KAS-RT.md             # RT fund management
├── 06-DOMPET.md             # Personal wallet
├── 07-ORGANISASI.md         # Organization structure
├── 08-JASA.md               # Community services
├── 09-PROFIL.md             # User profile
├── 10-ADMIN.md              # Admin dashboard
├── 11-NOTIFIKASI.md        # Notifications
├── 12-NAVIGATION.md         # Navigation system
└── 13-COMPONENTS.md        # UI components reference
```

---

## Quick Reference

### App Configuration
- **Max Width:** 430px
- **Theme:** Green primary (`#43a047`)
- **Fonts:** Manrope (headlines), Inter (body)
- **Language:** Indonesian

### Color Variables
```css
--color-primary: #43a047
--color-primary-hover: #2e7d32
--color-primary-muted: #d5ead7
--color-surface: #ffffff
--color-surface-alt: #f2faf3
--color-title: #1f5d24
--color-body: #3f4b42
--color-body-muted: #6f7d72
--color-input-border: #e5efe7
```

### Common Classes
- Page container: `flex h-full min-h-0 flex-col bg-app-surface-alt`
- Hero section: Gradient background with decorative blobs
- Card: `rounded-2xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.08)]`
- Primary button: Green with shadow, hover lift
- Bottom sheet: `rounded-t-[2rem]` with backdrop

### Routes
| Route | Description |
|-------|-------------|
| `/` | Entry point (redirects) |
| `/onboarding` | Welcome carousel |
| `/auth/login` | Login (2 steps) |
| `/auth/register` | Register (3 steps) |
| `/landing` | Home dashboard |
| `/kas-rt` | RT fund |
| `/dompet` | Personal wallet |
| `/organisasi` | Organization |
| `/jasa` | Services |
| `/profil` | Profile |
| `/admin` | Admin panel |
| `/notifikasi` | Notifications |

---

## Page-by-Page Summary

### Authentication Pages

#### Onboarding (`/onboarding`)
- 3-screen carousel
- Gradient background (#7bc67f → #a2d8a5 → #d5ead7)
- Welcome → Features → Get Started
- Skip option

#### Login (`/auth/login`)
- 2-step flow
- Hero with gradient + blobs
- Step 1: Username/WhatsApp input
- Step 2: PIN input (4 digits)
- Trust footer with lock icon
- Links to register

#### Register (`/auth/register`)
- 3-step wizard
- Step 0: Personal data + house block
- Step 1: Add family members
- Step 2: Set PIN
- Handles existing house/pending approval states

### Main App Pages

#### Landing (`/landing`)
- Profile header with saldo
- 9 feature tiles (3x3 grid)
- Info Warga section (announcements)
- UMKM section (horizontal scroll)
- Jasa section (vertical list)

#### Kas RT (`/kas-rt`)
- Hero with balance/income/expense metrics
- Filter bar (pills: All/Income/Expense)
- Transaction list with pull-to-refresh
- Bottom sheets for: filters, download, add/edit form
- Duplicate warning dialog
- Delete confirmation dialog

#### Dompet (`/dompet`)
- Balance card (indigo gradient)
- Income/expense summary
- Savings rate indicator with progress bar
- Expandable filter section
- Transaction cards with category icons
- Pull-to-refresh

#### Organisasi (`/organisasi`)
- Hero with role/member/vacant metrics
- Role sections with 2-column member grid
- Portrait-style member cards
- Square photo area
- WhatsApp contact integration
- Vacant position indicators

#### Jasa (`/jasa`)
- Hero with stats (total/available/categories)
- Search input
- Category chips (horizontal scroll)
- Service cards list
- Create/Edit/Detail modals
- Pagination

#### Profil (`/profil`)
- Avatar section with edit overlay
- Info rows (WhatsApp, email, DOB, etc.)
- Action cards: Edit, Theme, PIN, Family, Logout
- Theme selector (14 themes in grid)
- PIN change form
- Family management (for kepala keluarga)

#### Admin (`/admin`)
- Sticky header with refresh/notification buttons
- Hero with admin avatar and stats
- 2-column management grid
- Nav cards with badges
- Activity section (empty state placeholder)

#### Notifikasi (`/notifikasi`)
- Sticky header with unread count
- Grouped notifications (Terbaru/Kemarin/Minggu Ini/Sebelumnya)
- Notification cards with type-specific icons
- Mark all read button
- Tips Warga banner
- Empty state

---

## Design Tokens Summary

### Typography
| Element | Size | Weight | Family |
|---------|------|--------|--------|
| Display | 24px | 800 | Manrope |
| H1 | 18-20px | 800 | Manrope |
| H2 | 16px | 700 | Manrope |
| Body | 14px | 500-600 | Inter |
| Caption | 11-12px | 500 | Inter |
| Label | 10px | 700 | Inter |

### Spacing
| Token | Value |
|-------|-------|
| px-4 | 16px |
| p-4 | 16px |
| p-5 | 20px |
| gap-3 | 12px |
| gap-4 | 16px |

### Border Radius
| Token | Value |
|-------|-------|
| rounded-2xl | ~16px |
| rounded-3xl | ~24px |
| rounded-[2rem] | 32px |

---

## Component Patterns

### Hero Section
```tsx
<section className="relative overflow-hidden px-4 pb-5 pt-5"
         style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" }}>
  <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
  <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</section>
```

### Card
```tsx
<div className="rounded-2xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.08)] p-4">
  {/* Content */}
</div>
```

### Primary Button
```tsx
<button className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
        style={{ background: "var(--color-primary)", boxShadow: "0 8px 22px -12px var(--color-primary-shadow)" }}>
  Button Text
</button>
```

### Bottom Sheet
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]">
    {/* Content */}
  </div>
</>
```

### Input Field
```tsx
<input className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none transition-all"
       style={{ borderColor: "var(--color-input-border)" }}
       onFocus={(e) => {
         e.currentTarget.style.borderColor = "var(--color-primary)";
         e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
       }}
       onBlur={(e) => {
         e.currentTarget.style.borderColor = "var(--color-input-border)";
         e.currentTarget.style.boxShadow = "none";
       }} />
```

### Metric Pill
```tsx
<div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">Label</span>
  <span className="mt-0.5 text-[15px] font-extrabold text-white">Value</span>
</div>
```

---

## Icons Reference

### Heroicons (outline)
```typescript
import { BellIcon, HomeIcon, UserIcon, ... } from "@heroicons/react/24/outline";
```

### Heroicons (solid)
```typescript
import { BellIcon as BellSolidIcon, ... } from "@heroicons/react/24/solid";
```

### Material Symbols
```css
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}
```

---

## State Management

### Zustand Stores
```typescript
// auth-store
const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "warga-auth" }
  )
);

// onboarding-store
const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      setCompleted: (completed) => set({ completed }),
    }),
    { name: "warga-onboarding" }
  )
);

// appearance-store
const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      themeId: "green",
      setThemeId: (themeId) => set({ themeId }),
    }),
    { name: "warga-appearance" }
  )
);
```

---

## API Client

```typescript
// lib/api-client.ts
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return response;
}
```

---

## Next Steps for Stitch

1. **Read the design system first** - `00-DESIGN-SYSTEM.md`
2. **Reference specific pages** - Each page has detailed layout and component specs
3. **Use exact color values** - From CSS variables
4. **Follow component patterns** - From `13-COMPONENTS.md`
5. **Match spacing exactly** - Tailwind tokens listed throughout

---

## Important Notes

- All pages are mobile-first (max-width: 430px)
- Safe area insets for notched devices
- Indonesian language throughout
- Green theme default (14 themes available)
- Pull-to-refresh on list pages
- Bottom sheets for forms and filters
- Optimistic UI updates
- Skeleton loading states
