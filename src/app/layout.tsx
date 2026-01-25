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
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { OrganizationJsonLd, PersonJsonLd, WebSiteJsonLd } from "./components/seo/JsonLd";

// Theme constants - must match ThemeContext.tsx
const THEME_COOKIE_NAME = 'site-theme';
const VALID_THEMES = ['lightgradient', 'blackspace'] as const;
const DEFAULT_THEME = 'lightgradient';

type ThemeName = typeof VALID_THEMES[number];

function getServerTheme(cookieStore: Awaited<ReturnType<typeof cookies>>): ThemeName {
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME);
  const theme = themeCookie?.value;

  console.log('[Server Layout] Reading theme cookie:', {
    cookieExists: !!themeCookie,
    cookieValue: theme,
    willReturn: (theme && VALID_THEMES.includes(theme as ThemeName)) ? theme : DEFAULT_THEME
  });

  if (theme && VALID_THEMES.includes(theme as ThemeName)) {
    return theme as ThemeName;
  }
  return DEFAULT_THEME;
}

export const metadata: Metadata = {
  title: {
    default: "Joseph Sardella | Palm Desert Real Estate Agent | JPS Realtor",
    template: "%s | Joseph Sardella Real Estate",
  },
  description:
    "Buy, sell, or invest in the Palm Desert real estate market with Joseph Sardella, a local expert and trusted Realtor in the Coachella Valley. Serving Palm Desert, Indian Wells, La Quinta, Rancho Mirage, and Palm Springs.",
  metadataBase: new URL("https://jpsrealtor.com"),
  keywords: [
    "Palm Desert Realtor",
    "Coachella Valley Real Estate",
    "Palm Springs homes for sale",
    "Indian Wells real estate",
    "La Quinta homes",
    "Rancho Mirage properties",
    "Desert Hot Springs real estate",
    "Palm Desert homes for sale",
    "luxury homes Coachella Valley",
    "Joseph Sardella realtor",
    "JPS Realtor",
    "eXp Realty Palm Desert",
  ],
  authors: [{ name: "Joseph Sardella", url: "https://jpsrealtor.com" }],
  creator: "Joseph Sardella",
  publisher: "JPS Realtor",
  manifest: "/manifest.json",
  // themeColor removed - now handled dynamically by DynamicThemeColor component
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JP Realtor",
  },
  applicationName: "JP Realtor",
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
    url: "https://jpsrealtor.com",
    siteName: "Joseph Sardella Real Estate",
    title: "Joseph Sardella | Palm Desert Real Estate Agent",
    description: "Your trusted real estate expert in the Coachella Valley. Buy, sell, or invest with local expertise.",
    images: [
      {
        url: "/joey/about.png",
        width: 1200,
        height: 630,
        alt: "Joseph Sardella - Palm Desert Real Estate Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Joseph Sardella | Palm Desert Real Estate Agent",
    description: "Your trusted real estate expert in the Coachella Valley.",
    images: ["/joey/about.png"],
    creator: "@jpsrealtor",
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification
  },
  alternates: {
    canonical: "https://jpsrealtor.com",
  },
  category: "Real Estate",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read theme from cookie on the server
  const cookieStore = await cookies();
  const serverTheme = getServerTheme(cookieStore);

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
        <meta name="application-name" content="JP Realtor" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={statusBarStyle} />
        <meta name="apple-mobile-web-app-title" content="JP Realtor" />
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
                  var theme = cookieMatch ? cookieMatch[2] : localStorage.getItem('site-theme') || 'lightgradient';
                  if (theme !== 'lightgradient' && theme !== 'blackspace') theme = 'lightgradient';

                  console.log('[Inline Script] Detected theme:', theme, 'from cookie:', !!cookieMatch);

                  // Apply theme class
                  document.documentElement.className = document.documentElement.className.replace(/theme-\\w+/g, '') + ' theme-' + theme;

                  // Update meta tags IMMEDIATELY to match detected theme
                  var themeColor = theme === 'lightgradient' ? '#ffffff' : '#000000';
                  var statusBarStyle = theme === 'lightgradient' ? 'default' : 'black';

                  var metaThemeColor = document.querySelector('meta[name="theme-color"]');
                  if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', themeColor);
                    console.log('[Inline Script] Set theme-color to:', themeColor);
                  }

                  var metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
                  if (metaStatusBar) {
                    metaStatusBar.setAttribute('content', statusBarStyle);
                    console.log('[Inline Script] Set status-bar-style to:', statusBarStyle);
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

                      console.log('[Blocking Script] Creating solid color overlay:', solidColor);

                      // Create overlay DIV IMMEDIATELY
                      var overlay = document.createElement('div');
                      overlay.className = 'theme-transition-overlay';
                      overlay.id = 'instant-transition-overlay';
                      overlay.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background-color: ' + solidColor + '; pointer-events: none;';

                      // Add to body immediately (before React renders)
                      document.body.appendChild(overlay);

                      console.log('[Blocking Script] Overlay created - page content hidden behind solid color');
                    } else {
                      // Clear stale data
                      console.log('[Blocking Script] Stale animation data cleared');
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

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-613BBEB2FS`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-613BBEB2FS');
          `}
        </Script>
        <ClientLayoutWrapper initialTheme={serverTheme}>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
