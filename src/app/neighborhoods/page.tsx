// Server shell for the neighborhoods directory.
//
// The directory itself is a client component (region accordions, animation),
// which meant this page shipped ZERO server-rendered links: a grep of the
// delivered HTML on 2026-10-11 found 0 anchors to /neighborhoods/<city>.
// Googlebot therefore had no path from this hub to any city page, and 5 of 6
// primary city pages had never been crawled. The client UI is unchanged; the
// anchors below are added so the hub actually links to what it lists.

import type { Metadata } from "next";
import NeighborhoodsClient from "./NeighborhoodsClient";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import { getSoCalCityLinks } from "@/lib/crawl-index";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { buildPlaceMetadata, placeOgImageUrl } from "@/lib/seo-metadata";

// These tags used to live in ./layout.tsx, where they were inherited by every
// city, subdivision and buy/sell route beneath it — so ~1,600 statewide pages
// claimed to be this one Coachella Valley hub in og:title, og:description and
// og:image. They belong to THIS url and no other. See the note in layout.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrlFromHeaders();
  return buildPlaceMetadata({
    title: "California Neighborhoods | Browse Homes by City & Community",
    description:
      "Browse homes for sale by city and community across California, with active listing counts, median prices and local market data for each area.",
    canonical: `${baseUrl}/neighborhoods`,
    image: placeOgImageUrl(baseUrl, { name: "California", region: "Neighborhoods" }),
    imageAlt: "California neighborhoods directory",
  });
}

export default async function NeighborhoodsPage() {
  const cityLinks = await getSoCalCityLinks();

  return (
    <>
      <NeighborhoodsClient />
      {/* Collapsed: the region accordions above are the real navigation; this
          stays only so the city links exist in server HTML for crawlers. */}
      <CrawlableLinks
        title="All cities A–Z"
        description={`${cityLinks.length.toLocaleString()} with active listings`}
        links={cityLinks}
        collapsible
      />
    </>
  );
}
