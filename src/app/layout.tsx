// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import "./globals.css";
import "./styles/theme-transitions.css";
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
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { OrganizationJsonLd, PersonJsonLd, WebSiteJsonLd } from "./components/seo/JsonLd";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";
import { getServerNavLayout } from "@/lib/nav-layout";

// Theme constants - must match ThemeContext.tsx
const THEME_COOKIE_NAME = 'site-theme';
const VALID_THEMES = ['lightgradient', 'blackspace'] as const;
const DEFAULT_THEME = 'lightgradient';

type ThemeName = typeof VALID_THEMES[number];

function getServerTheme(cookieStore: Awaited<ReturnType<typeof cookies>>): ThemeName {
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME);
  const theme = themeCookie?.value;

  if (theme && VALID_THEMES.includes(theme as ThemeName)) {
    return theme as ThemeName;
  }
  return DEFAULT_THEME;
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
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: cfg.siteName,
    },
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
    alternates: {
      canonical: cfg.baseUrl,
    },
    category: "Real Estate",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read theme from cookie on the server
  const cookieStore = await cookies();
  const serverTheme = getServerTheme(cookieStore);

  // Resolve this tenant's nav layout server-side (avoids a post-hydration flash).
  const navLayout = await getServerNavLayout();

  // Get theme color for Dynamic Island/status bar
  const themeColor = serverTheme === 'lightgradient' ? '#ffffff' : '#000000';
  // Light theme: 'default' (light status bar, no black overlay)
  // Dark theme: 'black' (opaque black status bar)
  const statusBarStyle = serverTheme === 'lightgradient' ? 'default' : 'black';

  return (
    <html lang="en" className={`theme-${serverTheme}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
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

        {/* Inline script for theme - syncs cookie/localStorage and applies immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check cookie first (matches server), then localStorage
                  var cookieMatch = document.cookie.match(/(^| )site-theme=([^;]+)/);
                  var cookieTheme = cookieMatch ? cookieMatch[2] : null;
                  var localStorageTheme = localStorage.getItem('site-theme');

                  var theme = cookieTheme || localStorageTheme || 'lightgradient';

                  if (theme !== 'lightgradient' && theme !== 'blackspace') {
                    theme = 'lightgradient';
                  }

                  // Apply theme class
                  document.documentElement.className = document.documentElement.className.replace(/theme-\\w+/g, '') + ' theme-' + theme;

                  // Update meta tags IMMEDIATELY to match detected theme
                  var themeColor = theme === 'lightgradient' ? '#ffffff' : '#000000';
                  var statusBarStyle = theme === 'lightgradient' ? 'default' : 'black';

                  var metaThemeColor = document.querySelector('meta[name="theme-color"]');
                  if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', themeColor);
                  }

                  var metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
                  if (metaStatusBar) {
                    metaStatusBar.setAttribute('content', statusBarStyle);
                  }
                } catch (e) {
                  console.error('[Inline Script] Error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`theme-${serverTheme}`} suppressHydrationWarning>
        {/* Blocking script: Create solid color overlay IMMEDIATELY if returning from theme toggle */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check if we're returning from a theme toggle
                  var animationKey = sessionStorage.getItem('theme-transition-pair');
                  var timestamp = sessionStorage.getItem('theme-transition-timestamp');

                  if (animationKey && timestamp) {
                    var age = Date.now() - parseInt(timestamp, 10);

                    // Only create overlay if refresh happened within 5 seconds
                    if (age < 5000) {
                      // Detect current theme to determine solid color
                      var cookieMatch = document.cookie.match(/(^| )site-theme=([^;]+)/);
                      var theme = cookieMatch ? cookieMatch[2] : 'lightgradient';
                      var solidColor = theme === 'blackspace' ? '#000000' : '#ffffff';

                      // Create overlay DIV IMMEDIATELY
                      var overlay = document.createElement('div');
                      overlay.className = 'theme-transition-overlay';
                      overlay.id = 'instant-transition-overlay';
                      overlay.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background-color: ' + solidColor + '; pointer-events: none;';

                      // Add to body immediately (before React renders)
                      document.body.appendChild(overlay);

                      // SAFETY NET: Auto-remove overlay after 5 seconds max
                      // Prevents permanent black/white screen if React fails to hydrate
                      setTimeout(function() {
                        var staleOverlay = document.getElementById('instant-transition-overlay');
                        if (staleOverlay) {
                          staleOverlay.style.transition = 'opacity 0.5s ease-out';
                          staleOverlay.style.opacity = '0';
                          setTimeout(function() { staleOverlay.remove(); }, 500);
                          console.warn('[Blocking Script] Safety net: removed stale overlay after 5s');
                        }
                        // Also remove any other transition overlays
                        document.querySelectorAll('.theme-transition-overlay').forEach(function(el) { el.remove(); });
                        sessionStorage.removeItem('theme-transition-pair');
                        sessionStorage.removeItem('theme-transition-timestamp');
                      }, 5000);
                    } else {
                      // Clear stale data
                      sessionStorage.removeItem('theme-transition-pair');
                      sessionStorage.removeItem('theme-transition-timestamp');
                    }
                  }
                } catch (e) {
                  console.error('[Blocking Script] Error:', e);
                }
              })();
            `,
          }}
        />

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
        <ClientLayoutWrapper initialTheme={serverTheme} navLayout={navLayout}>
          {children}
          <Footer />
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
