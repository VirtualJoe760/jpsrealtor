// /buy — the one page that makes the generic buyer-side case.
//
// Created 2026-10-14 as the destination for content that was duplicated across
// ~460 per-city buy/sell URLs. Those now 301 to the relevant city page's #buy
// section, and the city page links here for the step-by-step explanation.

import type { Metadata } from "next";
import BuyHubClient from "./BuyHubClient";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import { getSoCalCityLinks } from "@/lib/crawl-index";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { buildPlaceMetadata, placeOgImageUrl } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrlFromHeaders();
  return buildPlaceMetadata({
    title: "Buying a Home in California | How the Process Works",
    description:
      "What to expect when buying a home in California, step by step — from financing and search through offer, inspection and close.",
    canonical: `${baseUrl}/buy`,
    image: placeOgImageUrl(baseUrl, { name: "Buying a Home", region: "California" }),
    imageAlt: "Buying a home in California",
  });
}

export default async function BuyHubPage() {
  const cityLinks = await getSoCalCityLinks();
  return (
    <>
      <BuyHubClient />
      {/* The link block is what makes this page a hub rather than a leaf: it
          is the shortest path from a generic "how to buy" query to the market
          the visitor actually cares about. */}
      <CrawlableLinks
        title="Browse homes by city"
        description={`${cityLinks.length.toLocaleString()} California cities with active listings`}
        links={cityLinks}
      />
    </>
  );
}
