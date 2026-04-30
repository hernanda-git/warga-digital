"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDaysIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export interface ResidentPostItem {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
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

function stripMarkdown(md: string): string {
  return md
    .replace(/<[^>]*>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/^={3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function PostCard({ item, href }: { item: ResidentPostItem; href: string }) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const displayContent = item.content
    ? stripMarkdown(item.content)
    : item.excerpt;

  return (
    <Link
      href={href}
      className="block bg-app-surface rounded-2xl shadow-sm overflow-hidden group transition-all duration-300 active:scale-[0.98]"
    >
      <article>
        {item.imageUrl ? (
          <div className="relative h-56 w-full">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 430px"
            />
          </div>
        ) : (
          <div className="relative h-56 w-full bg-app-primary-muted flex items-center justify-center">
            <UserCircleIcon className="w-20 h-20 text-app-primary opacity-50" />
          </div>
        )}

        <div className="p-6">
          <h3 className="text-xl font-bold text-[var(--color-title)] leading-tight mb-3 line-clamp-2 group-hover:text-app-primary transition-colors">
            {item.title}
          </h3>

          {displayContent && (
            <p className="text-sm text-[var(--color-body-muted)] leading-relaxed mb-3 line-clamp-5">
              {displayContent}
            </p>
          )}

          <div className="pt-4 border-t border-[var(--color-input-border)]/20">
            <div className="flex items-center gap-2">
              {item.authorAvatar ? (
                <Image
                  src={item.authorAvatar}
                  alt={item.author ?? ""}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  width={24}
                  height={24}
                />
              ) : (
                <UserCircleIcon className="w-6 h-6 text-[var(--color-body-muted)] shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <p className="text-[11px] font-medium text-[var(--color-body-muted)] truncate">
                  Dipublish oleh:{" "}
                  <span className="font-semibold text-[var(--color-body)]">
                    {item.author || "Admin"}
                  </span>
                  {item.authorBlock && (
                    <>
                      {" "}
                      -{" "}
                      <span className="font-medium text-[var(--color-primary)]">
                        {item.authorBlock}
                      </span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CalendarDaysIcon className="w-3 h-3 text-[var(--color-body-muted)]" />
                  <span className="text-[10px] font-medium text-[var(--color-body-muted)]">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
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
