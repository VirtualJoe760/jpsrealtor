// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "@fontsource/raleway";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jost/200.css"; // thin weight for the CHAT half of the wordmark
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { OrganizationJsonLd, PersonJsonLd, WebSiteJsonLd } from "./components/seo/JsonLd";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";
import { getServerTenantConfig } from "@/lib/nav-layout";

// Theme constants — must match ThemeContext.tsx (see docs/theming/README.md).
//
// `site-theme-pref` stores the visitor's PREFERENCE: light | dark | system.
// VERSIONED name on purpose: vercel.json stamps page HTML immutable, so
// long-cached OLD bundles still run the legacy ThemeContext, which auto-writes
// 'lightgradient'/'blackspace' into the old `site-theme` cookie on every
// mount. New code never writes `site-theme`, so stale bundles can't corrupt
// the preference — the legacy cookie is only a one-time MIGRATION source when
// `site-theme-pref` is absent: 'blackspace' → dark (only reachable via a real
// toggle back then), 'lightgradient' → system (auto-written for everyone, so
// it signals nothing).
// `site-theme-resolved` is the echo cookie the client writes with the
// device's resolved scheme, so system-preference visitors get the correct
// theme SERVER-rendered from their second request onward. First-ever visit
// has no echo → we render light and the client morphs smoothly post-mount.
const THEME_PREF_COOKIE_NAME = 'site-theme-pref';
const LEGACY_THEME_COOKIE_NAME = 'site-theme';
const RESOLVED_COOKIE_NAME = 'site-theme-resolved';

type ThemeName = 'lightgradient' | 'blackspace';
type ThemePreference = 'system' | 'light' | 'dark';

function getServerThemeState(cookieStore: Awaited<ReturnType<typeof cookies>>): {
  preference: ThemePreference;
  resolved: ThemeName;
} {
  const pref = cookieStore.get(THEME_PREF_COOKIE_NAME)?.value;
  const legacy = cookieStore.get(LEGACY_THEME_COOKIE_NAME)?.value;

  let preference: ThemePreference;
  if (pref === 'light' || pref === 'dark' || pref === 'system') {
    preference = pref; // versioned cookie always wins
  } else if (legacy === 'blackspace' || legacy === 'dark') {
    preference = 'dark'; // legacy explicit dark (migration)
  } else if (legacy === 'light') {
    preference = 'light'; // brief pre-versioning window wrote these
  } else {
    preference = 'system'; // absent, or legacy auto-written 'lightgradient'
  }

  if (preference !== 'system') {
    return { preference, resolved: preference === 'dark' ? 'blackspace' : 'lightgradient' };
  }

  const echo = cookieStore.get(RESOLVED_COOKIE_NAME)?.value;
  return { preference, resolved: echo === 'dark' ? 'blackspace' : 'lightgradient' };
}

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getDomainConfigFromHeaders();

  return {
    title: {
      default: cfg.defaultTitle,
      template: cfg.titleTemplate,
    },
    description: cfg.siteDescription,
    metadataBase: new URL(cfg.baseUrl),
    keywords:
      cfg.type === "platform"
        ? ["real estate platform", "AI real estate", "find a realtor", "ChatRealty"]
        : ["real estate", "homes for sale", "local realtor"],
    authors: [{ name: cfg.siteName, url: cfg.baseUrl }],
    creator: cfg.siteName,
    publisher: cfg.siteName,
    manifest: "/manifest-v2.json",
    // NOTE: no appleWebApp block — Next would emit its own
    // apple-mobile-web-app-* metas (including an implicit status-bar-style
    // "default") that land BEFORE and fight the theme-aware tags rendered
    // manually in <head>. Safari honors the first match, so dark-theme PWA
    // users got a light status bar. All three tags exist manually below.
    applicationName: cfg.siteName,
    formatDetection: {
      telephone: true,
      email: true,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: cfg.baseUrl,
      siteName: cfg.siteName,
      title: cfg.defaultTitle,
      description: cfg.siteDescription,
      images: [
        {
          url: cfg.ogImage.startsWith("http") ? cfg.ogImage : `${cfg.baseUrl}${cfg.ogImage}`,
          width: 1200,
          height: 630,
          alt: cfg.defaultTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: cfg.defaultTitle,
      description: cfg.siteDescription,
      images: [cfg.ogImage.startsWith("http") ? cfg.ogImage : `${cfg.baseUrl}${cfg.ogImage}`],
      creator: cfg.twitterHandle || undefined,
    },
    // NO alternates.canonical here. A root-layout canonical is INHERITED by
    // every page that doesn't set its own, which stamped the bare domain root
    // onto ~1,924 listing pages (+ /about, /pricing) — telling Google the
    // whole catalog was a duplicate of the homepage. Pages that want a
    // canonical set a path-preserving one themselves (homepage, listings,
    // neighborhoods, insights, lp). No canonical beats a wrong one.
    category: "Real Estate",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve this tenant's layout/branding config server-side (avoids the
  // post-hydration flash for nav layout AND font).
  const tenant = await getServerTenantConfig();
  const navLayout = tenant.navLayout;

  // Theme: an agent's themeMode locks the site to light/dark; otherwise the
  // visitor's preference (site-theme cookie) wins — default is SYSTEM, which
  // resolves via the client-written echo cookie (see getServerThemeState).
  const cookieStore = await cookies();
  const { preference: cookiePreference, resolved: cookieResolved } =
    getServerThemeState(cookieStore);
  const themeLocked = tenant.themeMode === "light" || tenant.themeMode === "dark";
  const serverTheme: ThemeName = tenant.themeMode === "light"
    ? "lightgradient"
    : tenant.themeMode === "dark"
      ? "blackspace"
      : cookieResolved;
  const serverPreference: ThemePreference = themeLocked
    ? (serverTheme === "blackspace" ? "dark" : "light")
    : cookiePreference;

  // Dynamic Island / browser chrome. SSR a single resolved meta; when the
  // visitor follows the system, ThemeContext swaps in DUAL media-query metas
  // after mount so Safari tracks OS changes natively.
  const themeColor = serverTheme === 'lightgradient' ? '#ffffff' : '#000000';
  // Light theme: 'default' (light status bar, no black overlay)
  // Dark theme: 'black' (opaque black status bar)
  const statusBarStyle = serverTheme === 'lightgradient' ? 'default' : 'black';
  const htmlClass = `theme-${serverTheme}${serverTheme === 'blackspace' ? ' dark' : ''}`;

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />

        {/* Meta (Facebook) domain verification — Business Settings → Brand
            Safety → Domains. One deployment serves all three hosts, so all
            three tokens ship in every response; Meta reads only the token
            matching the host it fetched. Must be static in <head> (Meta
            ignores JS-injected tags). Do not remove: unverifying a domain
            revokes Aggregated Event Measurement + link-edit permissions. */}
        <meta name="facebook-domain-verification" content="cx0d8mzk3moq5zo00x6jwczvdfo7hk" />
        <meta name="facebook-domain-verification" content="94ml2uw0bpi23pw4haaakjc6lmjxka" />
        <meta name="facebook-domain-verification" content="raq2r3ic1upg9z6ick2wqo016omla9" />
        <meta name="theme-color" content={themeColor} />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

        {/* PWA Meta Tags - Theme aware for Dynamic Island support */}
        <meta name="application-name" content="chatRealty" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={statusBarStyle} />
        <meta name="apple-mobile-web-app-title" content="chatRealty" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Pre-paint theme script. The SSR classes/metas above are already
            authoritative (cookie-driven), so this only does bookkeeping:
            1. one-time migration of the LEGACY site-theme cookie into the
               versioned site-theme-pref (blackspace → dark was a real choice;
               lightgradient → system, because the old code auto-wrote it for
               every visitor) — only when site-theme-pref doesn't exist yet,
               so stale old bundles churning the legacy cookie can't corrupt
               a preference that's already been established;
            2. write the site-theme-resolved echo cookie so the NEXT request
               server-renders the correct system theme from byte one; and
            3. clear the legacy localStorage keys old bundles fed on.
            It deliberately does NOT flip classes: on a first visit with a
            dark device we render a consistent light page and let
            ThemeContext morph it smoothly after mount — never a half-themed
            frame. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var suffix = '; path=/; max-age=' + (60 * 60 * 24 * 365) + '; SameSite=Lax';
                  var hasPref = /(^| )site-theme-pref=(light|dark|system)(;|$)/.test(document.cookie);
                  if (!hasPref) {
                    var m = document.cookie.match(/(^| )site-theme=([^;]+)/);
                    var legacy = m ? m[2] : null;
                    if (legacy === 'blackspace' || legacy === 'dark') {
                      document.cookie = 'site-theme-pref=dark' + suffix;
                    } else if (legacy === 'light') {
                      document.cookie = 'site-theme-pref=light' + suffix;
                    } else if (legacy) {
                      document.cookie = 'site-theme-pref=system' + suffix;
                    }
                  }
                  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.cookie = 'site-theme-resolved=' + (sysDark ? 'dark' : 'light') + suffix;
                  try {
                    localStorage.removeItem('site-theme');
                    localStorage.removeItem('last-theme-animation');
                  } catch (e2) {}
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={htmlClass}
        data-nav-layout={navLayout}
        suppressHydrationWarning
      >
        {/* JSON-LD Structured Data for SEO */}
        <OrganizationJsonLd />
        <PersonJsonLd />
        <WebSiteJsonLd />

        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <ClientLayoutWrapper
          initialTheme={serverTheme}
          initialPreference={serverPreference}
          navLayout={navLayout}
          themeLocked={themeLocked}
          forcedTheme={themeLocked ? serverTheme : undefined}
        >
          {children}
          <Footer />
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
