# Navigation System

## Bottom Navigation

### Component Location
`src/components/nav/BottomNav.tsx`

### Route List
```typescript
const BOTTOM_NAV_ROUTES = [
  "/landing",
  "/organisasi",
  "/dompet",
  "/kas-rt",
  "/jasa",
  "/profil",
  "/admin",
];
```

### Container
```tsx
<nav className="flex shrink-0 items-center justify-around border-t border-[var(--color-input-border)] bg-app-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-app-surface/85"
     aria-label="Navigasi utama">
```

### Navigation Items

#### Base Items (always shown)
```typescript
const BASE_NAV_ITEMS = [
  { href: "/landing", label: "Beranda", icon: HomeIcon },
  { href: "/kas-rt", label: "Kas RT", icon: KasRTIcon },
  { href: "/profil", label: "Profil", icon: ProfilIcon },
] as const;
```

#### Admin Item (conditional)
```typescript
const ADMIN_NAV_ITEM = {
  href: "/admin",
  label: "Admin",
  icon: AdminIcon,
} as const;
```

### Nav Item Rendering
```tsx
{navItems.map(({ href, label, icon: Icon }) => {
  const active = pathname === href || (href === "/landing" && pathname === "/");
  return (
    <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-all active:scale-[0.98]"
          aria-current={active ? "page" : undefined}>
      <span className={`flex h-6 w-6 items-center justify-center transition-colors ${active ? "text-app-primary" : "text-app-body-muted"}`}>
        <Icon active={active} />
      </span>
      <span className={`text-[10px] font-medium tracking-[0.01em] transition-colors ${active ? "text-app-primary" : "text-app-body-muted"}`}>
        {label}
      </span>
    </Link>
  );
})}
```

### Icon Components

```typescript
function HomeIcon({ active }: { active: boolean }) {
  const Icon = active ? HomeSolidIcon : HomeOutlineIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function KasRTIcon({ active }: { active: boolean }) {
  const Icon = active ? BuildingLibrarySolidIcon : BuildingLibraryIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function ProfilIcon({ active }: { active: boolean }) {
  const Icon = active ? UserCircleSolidIcon : UserCircleIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function AdminIcon({ active }: { active: boolean }) {
  const Icon = active ? Cog6ToothSolidIcon : Cog6ToothIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}
```

### Icons Used
```typescript
// Heroicons v2
HomeIcon as HomeOutlineIcon, HomeIcon as HomeSolidIcon
BuildingLibraryIcon, BuildingLibraryIcon as BuildingLibrarySolidIcon
UserCircleIcon, UserCircleIcon as UserCircleSolidIcon
Cog6ToothIcon, Cog6ToothIcon as Cog6ToothSolidIcon
```

---

## App Shell

### Component Location
`src/components/app-shell.tsx`

### Purpose
Wraps authenticated pages with bottom navigation.

### Structure
```tsx
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showBottomNav = BOTTOM_NAV_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/"),
  );

  return (
    <div className="flex min-h-[var(--app-height,100dvh)] w-full justify-center bg-app-surface-alt/80">
      <div className="relative flex h-[var(--app-height,100dvh)] w-full max-w-[430px] flex-col overflow-hidden border-x border-[var(--color-input-border)]">
        <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none pt-[env(safe-area-inset-top)] ${showBottomNav ? "" : "pb-[env(safe-area-inset-bottom)]"}`}>
          {children}
        </div>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
```

### Key Features
- Centers content with max-width 430px
- Adds left/right border for app-like feel
- Safe area insets for notched devices
- Bottom nav conditional on route

---

## Route Definitions

### Main Routes (with bottom nav)
| Route | Page | Description |
|-------|------|-------------|
| `/landing` | LandingPage | Home dashboard |
| `/organisasi` | OrganisasiPage | Organization structure |
| `/dompet` | DompetPage | Personal wallet |
| `/kas-rt` | KasRTPage | RT fund management |
| `/jasa` | JasaPage | Community services |
| `/profil` | ProfilePage | User profile |
| `/admin` | AdminPage | Admin dashboard |

### Auth Routes (no bottom nav)
| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirects | Entry point |
| `/onboarding` | OnboardingPage | Welcome carousel |
| `/auth/login` | LoginPage | Login form |
| `/auth/register` | RegisterPage | Registration wizard |

### Sub-routes
| Route | Description |
|-------|-------------|
| `/kas-rt/summary` | Financial summary |
| `/kas-rt/house-status` | House payment status |
| `/organisasi/manage` | Edit organization |
| `/admin/warga` | Manage residents |
| `/admin/blok-rumah` | Manage house blocks |
| `/admin/kas-rt-categories` | Manage categories |
| `/admin/join-request` | Approve requests |
| `/admin/roles` | Manage roles |
| `/admin/articles` | Manage articles |

---

## Page Transitions

### Authentication Flow
```
/ (root)
  ↓ (check auth state)
  ├── Authenticated → /landing
  └── Not Authenticated
        ├── First visit → /onboarding
        └── Returning → /auth/login
```

### Auth Pages
```
/auth/login
  ↓ (success)
  /landing

/auth/register (3 steps)
  ↓ (success)
  /landing
```

### Main App
```
/landing (default/home)
  ├── /kas-rt
  ├── /organisasi
  ├── /dompet
  ├── /jasa
  ├── /profil
  │     ├── Edit view
  │     ├── PIN change view
  │     └── Family management
  └── /admin
        ├── /admin/warga
        ├── /admin/blok-rumah
        ├── /admin/kas-rt-categories
        ├── /admin/join-request
        ├── /admin/roles
        └── /admin/articles
```

---

## Navigation Hooks

### useRouter
```typescript
import { useRouter } from "next/navigation";

// Navigate to page
router.push("/route");

// Replace current page (no back history)
router.replace("/route");

// Go back
router.back();
```

### usePathname
```typescript
import { usePathname } from "next/navigation";

const pathname = usePathname();
// Returns current route path
```

---

## Safe Area Handling

### CSS Variables
```css
--app-height: 100dvh;  /* Dynamic viewport height */
```

### Safe Area Insets
```css
/* Top */
pt-[env(safe-area-inset-top)]

/* Bottom */
pb-[max(0.5rem,env(safe-area-inset-bottom))]
```

### Bottom Nav Padding
```tsx
pb-[max(0.5rem,env(safe-area-inset-bottom))]
```

---

## Deep Linking

### WhatsApp Links
```typescript
function getWhatsAppLink(phoneNumber: string): string {
  const clean = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}`;
}

// Usage
<a href={getWhatsAppLink("08123456789")} target="_blank" rel="noopener noreferrer">
  Hubungi via WhatsApp
</a>
```

### External Links
- Always use `target="_blank"` for external links
- Include `rel="noopener noreferrer"` for security

---

## Accessibility

### ARIA Labels
```tsx
<nav aria-label="Navigasi utama" />
<button aria-label="Kembali" />
<button aria-label="Notifikasi" />
```

### Active State
```tsx
aria-current={active ? "page" : undefined}
```

### Screen Reader Support
- Semantic HTML elements
- Proper heading hierarchy
- Descriptive link text
