import "./globals.css";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import TestDataBanner from "@/components/TestDataBanner";
import ChapWidget from "@/components/ChapWidget";
import AccountMenu from "@/components/AccountMenu";
import HamburgerNav from "@/components/HamburgerNav";
import { AccountProvider } from "@/lib/account";
import { assetUrl } from "@/lib/asset-url";
import { getAgentProfile } from "@/lib/chatrealty";
import { license } from "@/lib/format";

// The site's own origin, for absolute URLs in social previews. On Vercel this
// resolves automatically; NEXT_PUBLIC_ASSET_ORIGIN overrides it for a custom
// domain. Without a metadataBase, Next emits RELATIVE og:image URLs, which
// every social scraper ignores — so a shared link previews with no picture.
export function siteOrigin(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_ASSET_ORIGIN;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

// Identity flows from the agent's ChatRealty profile (or the bundled sample in
// test-data mode) — update the profile on chatrealty.io and the site follows.
//
// SOCIAL PREVIEWS: og:* and twitter:* were absent entirely, so every link an
// agent shared — the whole point of a listing site — previewed as a bare URL
// with no title, no blurb, and no image. They are generated from the same
// profile the rest of the page uses, so they can never drift from it.
export async function generateMetadata(): Promise<Metadata> {
  const agent = await getAgentProfile();
  const name = agent.name || "Real Estate";
  const title = agent.headline ? `${name} — ${agent.headline}` : `${name} — Real Estate`;
  const description =
    agent.tagline ||
    "Search homes for sale, explore neighborhoods, and save your favorites.";
  const origin = siteOrigin();
  // Best available preview image, in order: a hand-placed public/og.png (a
  // purpose-built 1200×630 always wins), then the landscape hero photo, then
  // the headshot. Profile images are already absolute URLs.
  const ogImage = fs.existsSync(path.join(process.cwd(), "public", "og.png"))
    ? "/og.png"
    : agent.heroPhoto || agent.headshot || null;

  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title: { default: title, template: `%s — ${name}` },
    description,
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description,
      ...(origin ? { url: origin } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

// Drop a logo at public/logo.png (or .svg) and the header uses it automatically.
function findLogo(): string | null {
  for (const f of ["logo.svg", "logo.png"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return `/${f}`;
  }
  return null;
}

// All destinations live in the hamburger drawer — the hamburger is STANDARD
// on every breakpoint including desktop (framework decision, keep it).
// Favorites intentionally lives in the account menu, not here — saved homes
// are an account feature, not a top-level destination.
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
                <img src={assetUrl(logo)} alt={siteName} className="h-8 w-auto" />
              ) : (
                siteName
              )}
            </Link>
            <div className="flex items-center gap-3">
              <AccountMenu />
              <HamburgerNav items={[...NAV]} siteName={siteName} />
            </div>
          </div>
        </header>
        {/* Width and padding live in .cr-shell (app/globals.css), not in
            utilities here, so a full-bleed hero can stand the container down
            for its own route by wrapping itself in .cr-bleed — without any
            other route losing its padding. */}
        <main className="cr-shell">{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
          {/* COMPLIANCE — always visible, never remove: license number,
              brokerage, and team (when one exists). Contact info (phone/email)
              is the agent's choice: public here, or gated behind /contact. */}
          <p className="font-medium text-gray-600">
            {siteName}
            {agent.brokerageName ? ` · ${agent.brokerageName}` : ""}
          </p>
          {agent.licenseNumber && (
            // license() so an agent who already typed "DRE #…" doesn't get
            // "License #DRE #…" — same helper /about and /contact use.
            <p className="mt-1 font-medium text-gray-500">{license(agent.licenseNumber)}</p>
          )}
          <p className="mt-1">
            {[agent.phone, agent.email].filter(Boolean).join(" · ")}
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
