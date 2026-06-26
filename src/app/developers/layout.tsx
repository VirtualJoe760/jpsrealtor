// src/app/developers/layout.tsx
//
// Docs shell for the ChatRealty developer reference (/developers). A sticky
// left sidebar + a centered content container. Themed with the app's semantic
// Tailwind tokens (bg-background / text-foreground / border-border), so it
// tracks the active light/dark theme without any extra wiring.

import type { Metadata } from "next";
import Link from "next/link";
import DocsSidebar from "@/components/developers/DocsSidebar";

export const metadata: Metadata = {
  title: "Developer Reference — ChatRealty API",
  description:
    "Reference documentation for the ChatRealty API: a tenant-isolated real-estate backend you query with your own data. Authentication, the listings API, the listing schema, the MCP connector, and MLS sync.",
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <Link
              href="/developers"
              className="mb-6 block text-sm font-bold tracking-tight text-foreground"
            >
              ChatRealty
              <span className="ml-1 font-normal text-muted-foreground">Developers</span>
            </Link>
            <DocsSidebar />
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {/* Mobile section links (sidebar is hidden < lg) */}
          <div className="mb-6 flex flex-wrap gap-2 text-xs lg:hidden">
            <Link href="/developers" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              Overview
            </Link>
            <Link href="/developers/authentication" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              Auth
            </Link>
            <Link href="/developers/endpoints" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              Listings API
            </Link>
            <Link href="/developers/schema" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              Schema
            </Link>
            <Link href="/developers/mcp" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              MCP
            </Link>
            <Link href="/developers/sync" className="rounded-md border border-border px-2 py-1 text-muted-foreground">
              Sync
            </Link>
          </div>
          <article className="max-w-3xl">{children}</article>
        </main>
      </div>
    </div>
  );
}
