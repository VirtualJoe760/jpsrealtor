// Server-rendered <a href> index — the crawl graph Googlebot actually follows.
//
// Why this exists: every hub on this site renders its links client-side, and
// /chap (the map exposing the whole catalog) is Disallowed in robots.txt. That
// left the sitemap as Google's ONLY discovery channel. Measured 2026-10-11 on
// 200 random active listings: 82% of listings missing from the sitemap came
// back "URL is unknown to Google" — never crawled, never even discovered.
//
// A sitemap announces URLs; internal links are what pass authority and let
// Google re-find a page between sitemap fetches. These sections are plain
// server-rendered anchors so both work without JavaScript. They are visible
// (not display:none) on purpose — hidden link farms are a cloaking signal.

import Link from "next/link";

export interface CrawlLink {
  href: string;
  label: string;
  /** Optional right-aligned hint, e.g. a listing count */
  meta?: string | number;
}

interface CrawlableLinksProps {
  title: string;
  links: CrawlLink[];
  /** Rendered above the grid, e.g. "223 cities across Southern California" */
  description?: string;
  columns?: 2 | 3 | 4;
}

export default function CrawlableLinks({
  title,
  links,
  description,
  columns = 4,
}: CrawlableLinksProps) {
  if (!links.length) return null;

  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <nav
      aria-label={title}
      className="border-t border-neutral-200/60 dark:border-neutral-800 px-4 py-10 sm:px-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      ) : null}
      <ul className={`mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 ${colClass}`}>
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className="flex items-baseline justify-between gap-2 py-0.5 text-sm text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <span className="truncate">{link.label}</span>
              {link.meta !== undefined ? (
                <span className="shrink-0 text-xs tabular-nums text-neutral-400 dark:text-neutral-600">
                  {link.meta}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
