"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ShoppingCartIcon,
  BoltIcon,
  UserGroupIcon,
  WalletIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolidIcon,
  BanknotesIcon as BanknotesSolidIcon,
  BuildingOffice2Icon as BuildingOffice2SolidIcon,
  ShoppingCartIcon as ShoppingCartSolidIcon,
  BoltIcon as BoltSolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  WalletIcon as WalletSolidIcon,
  BellIcon as BellSolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  NewspaperIcon as NewspaperSolidIcon,
} from "@heroicons/react/24/solid";
import { hasAdminRoleInProfile } from "@/lib/roles";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/landing", label: "Beranda", icon: HomeIcon, activeIcon: HomeSolidIcon },
  { href: "/artikel", label: "Artikel", icon: NewspaperIcon, activeIcon: NewspaperSolidIcon },
  { href: "/kas-rt", label: "Kas RT", icon: BanknotesIcon, activeIcon: BanknotesSolidIcon },
  { href: "/ipl", label: "IPL", icon: BuildingOffice2Icon, activeIcon: BuildingOffice2SolidIcon },
  { href: "/jualan", label: "Jual Beli", icon: ShoppingCartIcon, activeIcon: ShoppingCartSolidIcon },
  { href: "/jasa", label: "Jasa", icon: BoltIcon, activeIcon: BoltSolidIcon },
  { href: "/organisasi", label: "Organisasi", icon: UserGroupIcon, activeIcon: UserGroupSolidIcon },
  { href: "/dompet", label: "Dompet", icon: WalletIcon, activeIcon: WalletSolidIcon },
  { href: "/notifikasi", label: "Notifikasi", icon: BellIcon, activeIcon: BellSolidIcon },
  { href: "/profil", label: "Profil", icon: UserCircleIcon, activeIcon: UserCircleSolidIcon },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Cog6ToothIcon,
  activeIcon: Cog6ToothSolidIcon,
};

let adminCheckFetched = false;

export function DesktopSidebar() {
  const pathname = usePathname();
  const [isAdminRt, setIsAdminRt] = useState(false);

  useEffect(() => {
    if (adminCheckFetched) return;
    adminCheckFetched = true;

    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setIsAdminRt(hasAdminRoleInProfile(data));
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

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-full lg:border-r lg:border-[var(--color-input-border)] lg:bg-app-surface lg:overflow-y-auto">
      {/* Logo / Brand */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-5 border-b border-[var(--color-input-border)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary text-white text-sm font-bold">
          WD
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-app-title truncate">Warga Digital</p>
          <p className="text-xs text-app-body-muted truncate">Sawangan Regensi RT 03</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navigasi desktop">
        {navItems.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive =
            pathname === href || (href === "/landing" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-app-primary-muted text-app-primary"
                  : "text-app-body hover:bg-app-surface-alt hover:text-app-title"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex h-5 w-5 items-center justify-center shrink-0">
                {isActive ? <ActiveIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--color-input-border)] px-5 py-4">
        <p className="text-xs text-app-body-muted">© 2024 Warga Digital</p>
      </div>
    </aside>
  );
}
