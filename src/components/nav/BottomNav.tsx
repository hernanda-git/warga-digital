"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingLibraryIcon,
  Cog6ToothIcon,
  HomeIcon as HomeOutlineIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BuildingLibraryIcon as BuildingLibrarySolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  HomeIcon as HomeSolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
} from "@heroicons/react/24/solid";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

const BASE_NAV_ITEMS = [
  { href: "/landing", label: "Beranda", icon: HomeIcon },
  { href: "/kas-rt", label: "Kas RT", icon: KasRTIcon },
  { href: "/profil", label: "Profil", icon: ProfilIcon },
] as const;
const ADMIN_NAV_ITEM = {
  href: "/admin",
  label: "Admin",
  icon: AdminIcon,
} as const;

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

// Module-level guard so the admin-fetch effect runs only once per page load,
// even when React 18 Strict Mode double-invokes mount → unmount → mount.
let adminFetchFired = false;

export function BottomNav() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const setAdminRole = useAuthStore((s) => s.setAdminRole);

  // ── Admin role: use persisted value from auth store (instant on first paint)
  //    then freshen it from the API in the background.
  useEffect(() => {
    if (adminFetchFired) return;
    adminFetchFired = true;

    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const result = hasAdminRoleInProfile(data);
        setAdminRole(result);
      })
      .catch(() => {
        adminFetchFired = false; // allow retry if request failed
      });

    return () => {
      cancelled = true;
    };
  }, [setAdminRole]);

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : BASE_NAV_ITEMS;

  return (
    <nav
      className="flex shrink-0 items-center justify-around border-t border-[var(--color-input-border)] bg-app-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-app-surface/85 lg:hidden"
      aria-label="Navigasi utama"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href === "/landing" && pathname === "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-all active:scale-[0.98]"
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center transition-colors ${
                active ? "text-app-primary" : "text-app-body-muted"
              }`}
            >
              <Icon active={active} />
            </span>
            <span
              className={`text-[10px] font-medium tracking-[0.01em] transition-colors ${
                active ? "text-app-primary" : "text-app-body-muted"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
