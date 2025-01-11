import type { Metadata } from "next";
import Script from "next/script"; // Import Next.js Script component
import "./globals.css";
import "@fontsource/raleway"; // Importing Raleway
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";


export const metadata: Metadata = {
  title: "Joseph Sardella | Coachella Valley Realtor",
  description:
    "Experience exceptional real estate services with Joseph Sardella, your trusted Coachella Valley Realtor specializing in buying, selling, and investing in the local market.",
  metadataBase: new URL("https://jpsrealtor.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Analytics */}
        <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-613BBEB2FS`}
        strategy="afterInteractive"
        />
        <Script
        id="google-analytics"
        strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-613BBEB2FS');
          `}
        </Script>
        {/* Tidio Chat Widget */}
        <Script
          src="//code.tidio.co/yfsps2esbezj0qmtplraoxxjdbvmb2td.js"
          strategy="lazyOnload" // Load after the page has loaded
        />
      </head>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
