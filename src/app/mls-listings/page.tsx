// src/app/mls-listings/page.tsx
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// 🔁 Dynamically import the client-only map component
const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

// 🧠 SEO Metadata
export const metadata: Metadata = {
  title: "Search MLS Listings | Coachella Valley Real Estate",
  description: "Browse active listings across the Coachella Valley. Use our interactive map to explore homes by location, price, and features.",
  openGraph: {
    title: "Search MLS Listings | Coachella Valley Real Estate",
    description: "Find your next home in Cathedral City, Palm Springs, La Quinta, and more. Real-time map search powered by MLS data.",
    type: "website",
    url: "https://www.jpsrealtor.com/mls-listings",
    images: [
      {
        url: "/city-images/cathedral-city.jpg",
        width: 1200,
        height: 630,
        alt: "Cathedral City Real Estate Map",
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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full bg-black">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Loading map and listings...</p>
      </div>
    </div>
  );
}

export default function SearchMapPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MapPageClient />
    </Suspense>
  );
}
