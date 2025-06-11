// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "@fontsource/raleway";
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "Joseph Sardella | Palm Desert Real Estate Agent | JPS Realtor",
  description:
    "Buy, sell, or invest in the Palm Desert real estate market with Joseph Sardella, a local expert and trusted Realtor in the Coachella Valley Area...",
  metadataBase: new URL("https://jpsrealtor.com"),
  keywords: [
    "Palm Springs Realtor",
    "Top Agent Palm Springs",
    "Top Realtor Palm Springs",
    // truncated for brevity...
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Scripts... */}
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
        {/* Other Scripts truncated for brevity */}
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      </head>
      <body>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
