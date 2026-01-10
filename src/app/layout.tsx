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
    statusBarStyle: "black-translucent",
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

  return (
    <html lang="en" className={`theme-${serverTheme}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

        {/* PWA Meta Tags - Theme aware for Dynamic Island support */}
        <meta name="application-name" content="JP Realtor" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* theme-color and statusBarStyle handled by metadata object above */}
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
                  document.documentElement.className = document.documentElement.className.replace(/theme-\\w+/g, '') + ' theme-' + theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`theme-${serverTheme}`} suppressHydrationWarning>
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
