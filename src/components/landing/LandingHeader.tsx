"use client";

import { BellIcon } from "@heroicons/react/24/outline";
import { Avatar } from "@/components/ui";

interface LandingHeaderProps {
  /** User display name */
  name?: string;
  /** Profile picture URL; when null/undefined, shows initials (MS Teams style) */
  profilePictureUrl?: string | null;
  /** Blok / rumah label, e.g. "Blok A - 12" */
  blokRumah?: string;
  /** Number of unread notifications; if > 0, shows badge */
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export function LandingHeader({
  name = "Warga",
  profilePictureUrl,
  blokRumah = "Blok —",
  notificationCount = 0,
  onNotificationPress,
}: LandingHeaderProps) {
  const showBadge = notificationCount > 0;
  return (
    <>
      {/* Mobile header (unchanged) */}
      <header className="flex shrink-0 items-center justify-between gap-3 bg-app-surface px-4 py-3 shadow-sm lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar
            name={name}
            src={profilePictureUrl}
            size={40}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-app-title">
              {name}
            </p>
            <p className="truncate text-xs text-app-body-muted">
              {blokRumah}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onNotificationPress}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-app-body-muted transition-colors hover:bg-app-primary-muted hover:text-app-primary active:opacity-80"
            aria-label="Notifikasi"
          >
            <BellIcon className="h-6 w-6" />
            {showBadge && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Desktop hero */}
      <section
        className="hidden lg:relative lg:flex lg:shrink-0 lg:overflow-hidden lg:px-6 lg:py-8"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div className="relative z-10 flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={name}
              src={profilePictureUrl}
              size={56}
              className="shrink-0 ring-4 ring-white/25"
            />
            <div>
              <p className="text-xl font-extrabold text-white">
                Selamat datang, {name}
              </p>
              <p className="text-sm text-white/70">{blokRumah}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
              Warga Digital &middot; Sawangan Regensi RT 03
            </span>
            <button
              type="button"
              onClick={onNotificationPress}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Notifikasi"
            >
              <BellIcon className="h-6 w-6" />
              {showBadge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
