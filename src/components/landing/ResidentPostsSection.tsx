"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDaysIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export interface ResidentPostItem {
  id: string;
  title: string;
  excerpt?: string;
  imageUrl?: string | null;
  author?: string;
  authorAvatar?: string | null;
  authorBlock?: string | null;
  createdAt?: string;
}

interface ResidentPostsSectionProps {
  title: string;
  items: ResidentPostItem[];
  detailHref?: (id: string) => string;
}

function PostPlaceholder() {
  return (
    <div
      className="h-full w-full bg-gradient-to-br from-[var(--color-primary-muted)] to-[color:color-mix(in_oklab,var(--color-primary),transparent_80%)]"
      aria-hidden
    >
      <div className="px-6 pt-10">
        <div className="h-3 w-[55%] rounded bg-white/90" />
        <div className="mt-3 h-2 w-[76%] rounded bg-white/60" />
        <div className="mt-2 h-2 w-[64%] rounded bg-white/60" />
      </div>
    </div>
  );
}

function PostCard({ item, href }: { item: ResidentPostItem; href: string }) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-xl bg-app-surface shadow-sm transition-shadow active:opacity-95 hover:shadow-md"
    >
      <article className="flex flex-col">
        <div className="relative h-32 w-full shrink-0 overflow-hidden">
          {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          ) : (
            <PostPlaceholder />
          )}
        </div>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <h3 className="truncate text-[13px] font-semibold text-app-title leading-tight">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="mt-1 line-clamp-2 text-[11px] text-app-body-muted leading-relaxed">
              {item.excerpt}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-app-body-muted">
              <CalendarDaysIcon className="w-3 h-3" />
              <span className="font-medium">{formatDate(item.createdAt)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 pt-2 border-t border-[var(--color-input-border)]/20">
            {item.authorAvatar ? (
              <Image
                src={item.authorAvatar}
                alt=""
                className="w-5 h-5 rounded-full object-cover shrink-0"
                width={20}
                height={20}
              />
            ) : (
              <UserCircleIcon className="w-5 h-5 text-app-body-muted shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-app-body-muted truncate">
                {item.author || "Admin"}
              </p>
              {item.authorBlock && (
                <p className="text-[9px] font-semibold text-[var(--color-primary)] truncate">
                  {item.authorBlock}
                </p>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function ResidentPostsSection({
  title,
  items,
  detailHref = (id) => `#post-${id}`,
}: ResidentPostsSectionProps) {
  return (
    <section aria-labelledby="resident-posts-title">
      <h2
        id="resident-posts-title"
        className="mb-3 text-lg font-bold text-app-title"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <PostCard key={item.id} item={item} href={detailHref(item.id)} />
        ))}
      </div>
    </section>
  );
}
