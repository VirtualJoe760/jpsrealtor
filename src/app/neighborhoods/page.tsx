// Server shell for the neighborhoods directory.
//
// The directory itself is a client component (region accordions, animation),
// which meant this page shipped ZERO server-rendered links: a grep of the
// delivered HTML on 2026-10-11 found 0 anchors to /neighborhoods/<city>.
// Googlebot therefore had no path from this hub to any city page, and 5 of 6
// primary city pages had never been crawled. The client UI is unchanged; the
// anchors below are added so the hub actually links to what it lists.

import NeighborhoodsClient from "./NeighborhoodsClient";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import { getSoCalCityLinks } from "@/lib/crawl-index";

export default async function NeighborhoodsPage() {
  const cityLinks = await getSoCalCityLinks();

  return (
    <>
      <NeighborhoodsClient />
      <CrawlableLinks
        title="Browse cities"
        description={`${cityLinks.length.toLocaleString()} Southern California cities with active listings`}
        links={cityLinks}
      />
    </>
  );
}
