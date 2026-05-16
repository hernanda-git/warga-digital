"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ShoppingCartIcon,
  BoltIcon,
  UserGroupIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  NewspaperIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolidIcon,
  BanknotesIcon as BanknotesSolidIcon,
  BuildingOffice2Icon as BuildingOffice2SolidIcon,
  ShoppingCartIcon as ShoppingCartSolidIcon,
  BoltIcon as BoltSolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  BellIcon as BellSolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  NewspaperIcon as NewspaperSolidIcon,
} from "@heroicons/react/24/solid";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
}

const BASE_NAV_ITEMS: NavItem[] = [
  {
    href: "/landing",
    label: "Beranda",
    icon: HomeIcon,
    activeIcon: HomeSolidIcon,
  },
  {
    href: "/artikel",
    label: "Artikel",
    icon: NewspaperIcon,
    activeIcon: NewspaperSolidIcon,
  },
  {
    href: "/kas-rt",
    label: "Kas RT",
    icon: BanknotesIcon,
    activeIcon: BanknotesSolidIcon,
  },
  {
    href: "/ipl",
    label: "IPL",
    icon: BuildingOffice2Icon,
    activeIcon: BuildingOffice2SolidIcon,
  },
  {
    href: "/jualan",
    label: "Jual Beli",
    icon: ShoppingCartIcon,
    activeIcon: ShoppingCartSolidIcon,
  },
  { href: "/jasa", label: "Jasa", icon: BoltIcon, activeIcon: BoltSolidIcon },
  {
    href: "/organisasi",
    label: "Organisasi",
    icon: UserGroupIcon,
    activeIcon: UserGroupSolidIcon,
  },
  {
    href: "/notifikasi",
    label: "Notifikasi",
    icon: BellIcon,
    activeIcon: BellSolidIcon,
  },
  {
    href: "/profil",
    label: "Profil",
    icon: UserCircleIcon,
    activeIcon: UserCircleSolidIcon,
  },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Cog6ToothIcon,
  activeIcon: Cog6ToothSolidIcon,
};

const SESSION_KEY = "isAdminRt";

function getSessionAdminRole(): boolean | null {
  try {
    const val = sessionStorage.getItem(SESSION_KEY);
    if (val === null) return null;
    return val === "true";
  } catch {
    return null;
  }
}

function setSessionAdminRole(value: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(value));
  } catch {
    // sessionStorage not available (e.g. SSR), silently ignore
  }
}

let adminCheckFetched = false;

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const [isAdminRt, setIsAdminRt] = useState<boolean>(() => {
    return getSessionAdminRole() ?? false;
  });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (getSessionAdminRole() !== null) return;
    if (adminCheckFetched) return;
    adminCheckFetched = true;

    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const result = hasAdminRoleInProfile(data);
        setSessionAdminRole(result);
        setIsAdminRt(result);
      })
      .catch(() => {
        adminCheckFetched = false;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = isAdminRt
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : BASE_NAV_ITEMS;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearUser();
      router.replace("/auth/login");
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-[var(--color-input-border)] lg:bg-white">
      {/* ── Brand Header ─────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-input-border)] px-5 py-4">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
          <Image
            src="/warga-digital.png"
            alt="Warga Digital"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--color-title)]">
            Warga Digital
          </p>
          <p className="truncate text-xs text-[var(--color-body-muted)]">
            Sawangan Regensi RT 03
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigasi desktop"
      >
        <div className="space-y-0.5">
          {navItems.map(
            ({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
              const isActive =
                pathname === href ||
                (href === "/landing" && pathname === "/") ||
                (href !== "/landing" && pathname?.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                      : "text-[var(--color-body)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-title)]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isActive ? (
                      <ActiveIcon className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              );
            },
          )}
        </div>
      </nav>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[var(--color-input-border)] px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-body-muted)] transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </span>
          <span className="truncate">
            {loggingOut ? "Keluar..." : "Keluar"}
          </span>
        </button>

        <p className="mt-2 px-3 text-[11px] text-[var(--color-body-muted)]">
          &copy; {new Date().getFullYear()} Warga Digital
        </p>
      </div>
    </aside>
  );
}
