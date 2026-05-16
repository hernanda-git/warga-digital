"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";
import { DesktopSidebar } from "@/components/nav/DesktopSidebar";
import { useAuthStore } from "@/stores/auth-store";

const APP_ROUTES = [
  "/landing",
  "/artikel",
  "/organisasi",
  "/dompet",
  "/kas-rt",
  "/ipl",
  "/jasa",
  "/jualan",
  "/usaha",
  "/profil",
  "/admin",
  "/notifikasi",
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAppRoute =
    isAuthenticated &&
    APP_ROUTES.some(
      (route) => pathname === route || pathname?.startsWith(route + "/"),
    );

  return (
    <div className="flex min-h-[var(--app-height,100dvh)] w-full justify-center bg-app-surface-alt/80">
      {/* Desktop: sidebar layout */}
      {isAppRoute && <DesktopSidebar />}

      {/* Main content container */}
      <div
        className={`
          relative flex h-[var(--app-height,100dvh)] flex-col overflow-hidden
          bg-app-surface
          ${
            isAppRoute
              ? // App routes: phone-like on mobile, full flex on desktop
                "w-full max-w-[430px] lg:max-w-none lg:flex-1"
              : // Auth/onboarding/other: full width
                "w-full"
          }
          ${isAppRoute ? "border-x border-[var(--color-input-border)] lg:border-x-0" : ""}
        `}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none pt-[env(safe-area-inset-top)] ${
            isAppRoute ? "" : "pb-[env(safe-area-inset-bottom)]"
          }`}
        >
          {children}
        </div>
        {isAppRoute && <BottomNav />}
      </div>
    </div>
  );
}
