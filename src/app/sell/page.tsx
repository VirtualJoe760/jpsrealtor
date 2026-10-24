// /sell — the one page that makes the generic seller-side case.
//
// Also the replacement for /selling, which was a real route in the sitemap
// whose component rendered the literal string "page" inside a <div>. A declared
// URL that renders nothing is worse than an undeclared one: it spends crawl
// budget to teach Google the site has empty pages. /selling now 301s here.

import type { Metadata } from "next";
import SellHubClient from "./SellHubClient";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import { getSoCalCityLinks } from "@/lib/crawl-index";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { buildPlaceMetadata, placeOgImageUrl } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrlFromHeaders();
  return buildPlaceMetadata({
    title: "Selling a Home in California | Pricing, Prep & Process",
    description:
      "What it takes to sell a home in California — how pricing is set, what preparation pays for itself, and what to expect from offer to close.",
    canonical: `${baseUrl}/sell`,
    image: placeOgImageUrl(baseUrl, { name: "Selling a Home", region: "California" }),
    imageAlt: "Selling a home in California",
  });
}

export default async function SellHubPage() {
  const cityLinks = await getSoCalCityLinks();
  return (
    <>
      <SellHubClient />
      <CrawlableLinks
        title="Market data by city"
        description={`${cityLinks.length.toLocaleString()} California cities with active listings`}
        links={cityLinks}
      />
    </>
  );
}
