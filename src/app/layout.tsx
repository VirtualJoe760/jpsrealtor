import type { Metadata } from "next";
import Script from "next/script"; // Import Next.js Script component
import "./globals.css";
import "@fontsource/raleway"; // Importing Raleway
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";


export const metadata: Metadata = {
  title: "Joseph Sardella | Top Realtor Palm Springs Midcentury Modern | JPS Realtor",
  description: "Buy, sell, or invest in Coachella Valley real estate with Joseph Sardella, a local expert and trusted Realtor in the Greater Palm Springs area. If you are looking for Palm Springs Luxury Real Estate, Midcentury Modern, or Investment properties like Coachella Valley Multifamily properties, Joseph Sardella is the Real Estate Agent for you. Fill out the contact form and find your next property today.",
  metadataBase: new URL("https://jpsrealtor.com"),
  keywords: [
    "Coachella Valley Realtor",
    "Palm Springs homes for sale",
    "Luxury real estate Coachella Valley",
    "top realtor in palm springs",
    "palm springs realtor",
    "Investment properties Coachella Valley",
    "Joseph Sardella Realtor",
    "Coachella Valley real estate agent",
    "Desert luxury homes",
    "Homes near Palm Springs golf courses",
    "Real estate investments Coachella Valley",
    "Vacation homes in Coachella Valley",
    "Coachella Valley real estate",
    "Palm Desert real estate",
    "La Quinta homes for sale",
    "Rancho Mirage properties",
    "Indian Wells luxury homes",
    "Indio real estate listings",
    "Cathedral City houses for sale",
    "Coachella Valley luxury real estate",
    "Golf course homes in Coachella Valley",
    "Mid-century modern homes in Palm Springs",
    "Gated communities in Rancho Mirage",
    "Waterfront properties in La Quinta",
    "jpsrealtor",
    "jps realtor",
    "Joseph Sardella real estate agent",
    "Joseph Sardella Realtor",
    "Joseph Sardella Palm Springs",
    "Joseph Sardella Coachella Valley",
    "Joseph Sardella real estate expert",
    "Joseph Sardella homes for sale",
    "Coachella Valley homes by Joseph Sardella",
    "Joseph Sardella listings in Palm Springs",
    "jpsrealtor",
    "jpsrealtor.com",
    "Indian Wells real estate",
    "Palm Desert luxury homes",
    "Indio houses for sale",
    "Homes for sale in La Quinta",
    "Cathedral City real estate",
    "Rancho Mirage luxury homes",
    "Indian Wells real estate agent",
    "Homes near Indio golf courses",
    "Palm Desert properties for sale",
    "La Quinta gated communities",
    "Mid-century modern homes Coachella Valley",
    "Palm Desert mid-century modern homes",
    "La Quinta mid-century modern homes",
    "Rancho Mirage mid-century modern real estate",
    "Indian Wells mid-century modern properties",
    "Coachella Valley mid-century architecture"
  ]
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
