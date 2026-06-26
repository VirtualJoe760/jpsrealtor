"use client";

// src/app/components/developers/DocsSidebar.tsx
//
// Left-hand navigation for the /developers reference docs. Client component so
// it can highlight the active section against the current pathname.

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Get started",
    items: [{ href: "/developers", label: "Overview" }],
  },
  {
    title: "Reference",
    items: [
      { href: "/developers/authentication", label: "Authentication" },
      { href: "/developers/endpoints", label: "Listings API" },
      { href: "/developers/schema", label: "Listing schema" },
    ],
  },
  {
    title: "Integrate",
    items: [
      { href: "/developers/mcp", label: "MCP connector" },
      { href: "/developers/sync", label: "Sync your MLS data" },
    ],
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 text-sm" aria-label="Developer documentation">
      {NAV.map((section) => (
        <div key={section.title}>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-md px-3 py-1.5 transition-colors ${
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
