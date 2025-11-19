// src/app/mls-listings/page.tsx
import type { Metadata } from "next";
import MapClientWrapper from "./MapClientWrapper";

// 🧠 SEO Metadata
export const metadata: Metadata = {
  title: "Search MLS Listings | Coachella Valley Real Estate",
  description:
    "Browse active listings across the Coachella Valley. Use our interactive map to explore homes by location, price, and features.",
  openGraph: {
    title: "Search MLS Listings | Coachella Valley Real Estate",
    description:
      "Find your next home in Cathedral City, Palm Springs, La Quinta, and more. Real-time map search powered by MLS data.",
    type: "website",
    url: "https://www.jpsrealtor.com/mls-listings",
    images: [
      {
        url: "/city-images/cathedral-city.jpg",
        width: 1200,
        height: 630,
        alt: "Coachella Valley Real Estate Listings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search MLS Listings | Coachella Valley Real Estate",
    description: "Find homes for sale in real-time using our map search.",
    images: ["/city-images/cathedral-city.jpg"],
  },
};

export default function SearchMapPage() {
  return (
    <div className="fixed top-32 bottom-0 left-0 right-0 overflow-hidden">
      <MapClientWrapper />
    </div>
  );
}
