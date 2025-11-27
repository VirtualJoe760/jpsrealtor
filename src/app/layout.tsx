// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="JP Realtor" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JP Realtor" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Inline script to prevent theme flash - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('site-theme') || 'lightgradient';
                  document.documentElement.classList.add('theme-' + savedTheme);
                  document.body.classList.add('theme-' + savedTheme);
                } catch (e) {
                  document.documentElement.classList.add('theme-lightgradient');
                  document.body.classList.add('theme-lightgradient');
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
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
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
