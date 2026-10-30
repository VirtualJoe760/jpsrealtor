// src/app/neighborhoods/[cityId]/[slug]/page.tsx
// Subdivision detail page
//
// ── What was wrong here, and what each fix addresses ────────────────────────
//
// METADATA. Like every route under app/neighborhoods/layout.tsx, this page set
// only title/description/canonical, so og:title, og:description, og:image and
// keywords were inherited from that layout's hardcoded Coachella Valley block —
// a photo of La Quinta on all ~1,400 community pages. And the description was
// `subdivision.description` raw: Sun City Shadow Hills shipped its entire
// ~600-character About paragraph as a meta description, which Google truncates
// mid-word. Both go through buildPlaceMetadata() now.
//
// SERVER-RENDERED CONTENT. The city page at least had a server-rendered list of
// listing anchors. This page had NONE: "Available Homes" and "Featured
// Listings" were both client components, so Googlebot's first pass saw two
// headings, "Loading listings...", and no links at all. Every listing whose
// only inbound link was this page was therefore undiscoverable except via the
// sitemap — and 82% of sitemap-only listings came back "URL is unknown to
// Google" in the 2026-10-11 sample.
//
// THINNESS. Nothing on the page said what the community IS. HOA cost, age
// restriction, Mello-Roos exposure, year-built range and sold history are the
// facts people search for by community name, and all of them are derivable.
//
// ISOLATION. No sibling links. The only route from one Indio community to
// another was back up through the city page.

import { Metadata } from "next";
import SubdivisionPageClient from "./SubdivisionPageClient";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd, PlaceJsonLd } from "@/app/components/seo/JsonLd";
import { createSlug } from "@/lib/utils/slug";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { buildPlaceMetadata, placeOgImageUrl } from "@/lib/seo-metadata";
import { getMarketStats, getPlaceProfile, formatPrice } from "@/lib/market-stats";
import { getSubdivisionIndexability, logIndexability } from "@/lib/indexability";
import MarketStatsBlock from "@/app/components/seo/MarketStatsBlock";
import SubdivisionFacts from "@/app/components/seo/SubdivisionFacts";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import {
  getSiblingSubdivisionLinks,
  getSubdivisionListingLinks,
} from "@/lib/crawl-index";

interface SubdivisionPageProps {
  params: Promise<{
    cityId: string;
    slug: string;
  }>;
}

/**
 * Resolve the subdivision for this city.
 *
 * Many subdivisions share a name across cities ("Downtown"), so the slug alone
 * is ambiguous and the city has to disambiguate. Matching on
 * `createSlug(s.city)` rather than a stored city slug is deliberate: the route
 * is built that way, and deriving the city from the record is what fixed the 4
 * dead subdivision URLs the old hardcoded constant produced by pairing
 * neighborhoods with the wrong cities.
 */
async function resolveSubdivision(cityId: string, slug: string) {
  await dbConnect();
  const candidates = await Subdivision.find({ slug }).lean();
  return candidates.find((s) => createSlug(s.city) === cityId) || null;
}

/** True when `communityFacts` holds anything beyond an empty shell. */
function hasFacts(sub: any): boolean {
  const f = sub?.communityFacts;
  if (!f || typeof f !== "object") return false;
  return Object.values(f).some((v) => v !== null && v !== undefined && v !== "");
}

export async function generateMetadata({
  params,
}: SubdivisionPageProps): Promise<Metadata> {
  const { cityId, slug } = await params;
  const subdivision: any = await resolveSubdivision(cityId, slug);

  if (!subdivision) {
    return { title: "Subdivision Not Found", robots: { index: false, follow: false } };
  }

  const baseUrl = await getBaseUrlFromHeaders();
  const stats = await getMarketStats({
    scope: "subdivision",
    name: subdivision.name,
    city: subdivision.city,
  });
  const gate = getSubdivisionIndexability(
    {
      name: subdivision.name,
      hasManualData: subdivision.hasManualData,
      hasCommunityFacts: hasFacts(subdivision),
    },
    stats,
    subdivision.region,
  );

  // A WRITTEN description, not the whole About paragraph.
  //
  // The template leads with what a searcher asked for — how many homes, how
  // much — and then the one fact that distinguishes the community. The raw
  // `subdivision.description` is only a fallback, and buildPlaceMetadata
  // truncates it to ~155 characters on a word boundary either way.
  const facts = subdivision.communityFacts || {};
  const keyFact =
    facts.communityType === "55plus"
      ? "55+ community"
      : facts.golfCourses
        ? "Golf community"
        : facts.securityType
          ? "Gated community"
          : null;

  const descParts: string[] = [];
  if (stats?.activeCount) {
    descParts.push(
      `${stats.activeCount} ${stats.activeCount === 1 ? "home" : "homes"} for sale in ${subdivision.name}, ${subdivision.city}`,
    );
  } else {
    descParts.push(`${subdivision.name} in ${subdivision.city}, CA`);
  }
  if (stats?.medianListPrice != null) {
    descParts.push(`Median ${formatPrice(stats.medianListPrice)}`);
  }
  if (keyFact) descParts.push(keyFact);
  const description = descParts.length > 1
    ? `${descParts.join(". ")}.`
    : subdivision.description || descParts[0];

  return buildPlaceMetadata({
    title: `${subdivision.name} Homes for Sale | ${subdivision.city}, CA`,
    description,
    canonical: `${baseUrl}/neighborhoods/${cityId}/${slug}`,
    image: placeOgImageUrl(baseUrl, {
      name: subdivision.name,
      region: subdivision.city,
      activeCount: stats?.activeCount,
      medianPrice: stats?.medianListPrice,
    }),
    imageAlt: `${subdivision.name}, ${subdivision.city} homes for sale`,
    index: gate.index,
  });
}

export default async function SubdivisionPage({ params }: SubdivisionPageProps) {
  const { cityId, slug } = await params;
  const subdivision: any = await resolveSubdivision(cityId, slug);

  if (!subdivision) {
    notFound();
  }

  // Serialize subdivision to plain object for Client Component
  const serializedSubdivision = JSON.parse(JSON.stringify(subdivision));

  const baseUrl = await getBaseUrlFromHeaders();

  const [stats, profile, listingLinks, siblings] = await Promise.all([
    getMarketStats({ scope: "subdivision", name: subdivision.name, city: subdivision.city }),
    getPlaceProfile({ scope: "subdivision", name: subdivision.name, city: subdivision.city }),
    getSubdivisionListingLinks(subdivision.name, 100),
    getSiblingSubdivisionLinks(subdivision.city, cityId, slug, 12),
  ]);

  const gate = getSubdivisionIndexability(
    {
      name: subdivision.name,
      hasManualData: subdivision.hasManualData,
      hasCommunityFacts: hasFacts(subdivision),
    },
    stats,
    subdivision.region,
  );
  logIndexability("subdivision", `${cityId}/${slug}`, gate);

  const cityUrl = `${baseUrl}/neighborhoods/${cityId}`;
  const breadcrumbItems = [
    { name: "Home", url: baseUrl },
    { name: "Neighborhoods", url: `${baseUrl}/neighborhoods` },
    { name: subdivision.city, url: cityUrl },
    { name: subdivision.name, url: `${baseUrl}/neighborhoods/${cityId}/${slug}` },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <PlaceJsonLd
        type="Neighborhood"
        name={subdivision.name}
        description={
          stats?.medianListPrice != null
            ? `${subdivision.name}, a community in ${subdivision.city}, California. ${stats.activeCount} homes for sale, median asking price ${formatPrice(stats.medianListPrice)}.`
            : subdivision.description || `${subdivision.name}, ${subdivision.city}, California.`
        }
        url={`${baseUrl}/neighborhoods/${cityId}/${slug}`}
        latitude={subdivision.coordinates?.latitude}
        longitude={subdivision.coordinates?.longitude}
        containedIn={{ name: subdivision.city, url: cityUrl }}
        regionName={subdivision.region}
      />

      {/* A VISIBLE breadcrumb, matching the JSON-LD. The page declared a
          four-level BreadcrumbList while rendering a single "Back to {city}"
          button, so the structured data described a hierarchy the page did not
          show. Server-rendered, so these are also real crawlable links up the
          tree. */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-7xl px-4 pt-4 text-sm text-neutral-500 md:pt-12 dark:text-neutral-400"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <a href="/" className="hover:underline">
              Home
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a href="/neighborhoods" className="hover:underline">
              Neighborhoods
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a href={`/neighborhoods/${cityId}`} className="hover:underline">
              {subdivision.city}
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-neutral-700 dark:text-neutral-200">
            {subdivision.name}
          </li>
        </ol>
      </nav>

      <SubdivisionPageClient
        cityId={cityId}
        slug={slug}
        subdivision={serializedSubdivision}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-8">
        <SubdivisionFacts
          subdivisionName={subdivision.name}
          facts={subdivision.communityFacts}
          profile={profile}
          seniorCommunity={subdivision.seniorCommunity}
        />
        {stats ? (
          <MarketStatsBlock stats={stats} placeName={subdivision.name} />
        ) : null}
      </div>

      {/* The listing anchors this page never had. */}
      <CrawlableLinks
        title={`Homes for sale in ${subdivision.name}`}
        description={
          stats && stats.activeCount > listingLinks.length
            ? `Showing ${listingLinks.length.toLocaleString()} of ${stats.activeCount.toLocaleString()} active listings`
            : `${listingLinks.length.toLocaleString()} active listings`
        }
        links={listingLinks}
        columns={3}
      />

      {siblings.length > 0 ? (
        <CrawlableLinks
          title={`Other communities in ${subdivision.city}`}
          links={siblings}
          columns={4}
        />
      ) : null}
    </>
  );
}
