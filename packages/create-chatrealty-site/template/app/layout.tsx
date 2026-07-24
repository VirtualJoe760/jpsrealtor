import "./globals.css";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import TestDataBanner from "@/components/TestDataBanner";
import ChapWidget from "@/components/ChapWidget";
import AccountMenu from "@/components/AccountMenu";
import { AccountProvider } from "@/lib/account";
import { getAgentProfile } from "@/lib/chatrealty";

// Identity flows from the agent's ChatRealty profile (or the bundled sample in
// test-data mode) — update the profile on chatrealty.io and the site follows.
export async function generateMetadata(): Promise<Metadata> {
  const agent = await getAgentProfile();
  const name = agent.name || "Real Estate";
  return {
    title: {
      default: agent.headline ? `${name} — ${agent.headline}` : `${name} — Real Estate`,
      template: `%s — ${name}`,
    },
    description:
      agent.tagline ||
      "Search homes for sale, explore neighborhoods, and save your favorites.",
  };
}

// Drop a logo at public/logo.png (or .svg) and the header uses it automatically.
function findLogo(): string | null {
  for (const f of ["logo.svg", "logo.png"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return `/${f}`;
  }
  return null;
}

// Favorites intentionally lives in the account menu (right side), not here —
// saved homes are an account feature, not a top-level destination.
const NAV = [
  { href: "/listings", label: "Listings" },
  { href: "/discover", label: "Discover" },
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  const logo = findLogo();
  const siteName = agent.name || "My Real Estate";

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <AccountProvider>
        <TestDataBanner />
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={siteName} className="h-8 w-auto" />
              ) : (
                siteName
              )}
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden items-center gap-5 text-sm font-medium text-gray-600 sm:flex">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-brand">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <AccountMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
          <p className="font-medium text-gray-600">
            {siteName}
            {agent.brokerageName ? ` · ${agent.brokerageName}` : ""}
          </p>
          <p className="mt-1">
            {[agent.phone, agent.email, agent.licenseNumber].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2">
            Listing data via the MLS. Powered by{" "}
            <a href="https://chatrealty.io" className="underline">
              ChatRealty
            </a>
            .
          </p>
        </footer>
        <ChapWidget />
        </AccountProvider>
      </body>
    </html>
  );
}
