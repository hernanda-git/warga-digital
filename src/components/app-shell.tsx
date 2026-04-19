"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";

const BOTTOM_NAV_ROUTES = [
  "/landing",
  "/artikel",
  "/organisasi",
  "/dompet",
  "/kas-rt",
  "/jasa",
  "/profil",
  "/admin",
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showBottomNav = BOTTOM_NAV_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/"),
  );

  return (
    <div className="flex min-h-[var(--app-height,100dvh)] w-full justify-center bg-app-surface-alt/80">
      <div className="relative flex h-[var(--app-height,100dvh)] w-full max-w-[430px] flex-col overflow-hidden border-x border-[var(--color-input-border)]">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none pt-[env(safe-area-inset-top)] ${
            showBottomNav ? "" : "pb-[env(safe-area-inset-bottom)]"
          }`}
        >
          {children}
        </div>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
