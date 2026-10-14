// src/app/neighborhoods/[cityId]/page.tsx
//
// One route serves three page types: region, county and city.
//
// ── What changed on 2026-10-14, and why ─────────────────────────────────────
//
// This page used to export `{ title, description, alternates }` and nothing
// else, which meant og:title, og:description, og:image and keywords were all
// INHERITED from app/neighborhoods/layout.tsx — a hardcoded Coachella Valley
// block with a photo of La Quinta. Every city in the state, Riverside
// included, announced itself to social platforms and to Google's preview as
// the same CV hub page. Metadata now goes through buildPlaceMetadata(), which
// cannot produce a title without a matching og:title.
//
// The page body also carried four numbers and otherwise pure template. The
// four numbers came from `cities.listingCount`, which counts EVERY property
// type — Indio's "818 active" was 487 homes plus 189 rentals plus 66 land
// parcels, which is why the same page's About text said 571 and the price
// range read "$1k – $5.9M" (the floor was a rental). Real for-sale figures and
// a computed market-stats block come from lib/market-stats now.
//
// And every page was declared indexable regardless of whether it had anything
// on it. lib/indexability.ts gates that, so a market with six sales a year
// stops asking to be ranked while staying live for users.

import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import CityPageClient from "./CityPageClient";
import CityBuySellSections from "./CityBuySellSections";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import { FaqJsonLd, FaqSection, getCityFaqs } from "@/app/components/seo/FaqJsonLd";
import { BreadcrumbJsonLd, PlaceJsonLd } from "@/app/components/seo/JsonLd";
import {
  getNeighborhoodsDirectory,
  formatCountyLabel,
} from "@/lib/neighborhoods-data";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { createSlug } from "@/lib/utils/slug";
import CrawlableLinks from "@/app/components/seo/CrawlableLinks";
import { getCityListingLinks, getNearbyCityLinks } from "@/lib/crawl-index";
import { getMarketStats, type MarketStats } from "@/lib/market-stats";
import {
  getCityIndexability,
  logIndexability,
  type IndexabilityResult,
} from "@/lib/indexability";
import { buildPlaceMetadata, placeOgImageUrl } from "@/lib/seo-metadata";
import MarketStatsBlock from "@/app/components/seo/MarketStatsBlock";
import ServiceAreaNote from "@/app/components/seo/ServiceAreaNote";
import { coachellaValleyCities } from "@/app/constants/cities";

interface SubdivisionData {
  name: string;
  slug: string;
  listings: number;
}

interface CityData {
  name: string;
  slug: string;
  listings: number;
  // Populated by getNeighborhoodsDirectory(); used for the crawlable
  // neighborhood index at the foot of the page.
  subdivisions?: SubdivisionData[];
}

interface CountyData {
  name: string;
  slug: string;
  listings: number;
  cities: CityData[];
}

interface RegionData {
  name: string;
  slug: string;
  listings: number;
  counties: CountyData[];
}

type PageType = "city" | "county" | "region";

interface PageData {
  type: PageType;
  city?: CityData;
  countyName?: string;
  county?: CountyData;
  region?: RegionData;
}

/** How many listing anchors the page renders. See the honest-count note below. */
const LISTING_LINK_LIMIT = 250;

// Query DB directly instead of fetching own API route (avoids Vercel serverless deadlock)
async function getPageData(slug: string): Promise<PageData | null> {
  try {
    const regions = await getNeighborhoodsDirectory();
    if (!regions) return null;

    // Check if it's a region slug
    const region = regions.find((r) => r.slug === slug);
    if (region) {
      return { type: "region", region };
    }

    // Check if it's a county slug
    for (const region of regions) {
      const county = region.counties.find((c: any) => c.slug === slug);
      if (county) {
        return { type: "county", county, region };
      }
    }

    // Check if it's a city slug
    for (const region of regions) {
      for (const county of region.counties) {
        const city = county.cities.find((c: any) => c.slug === slug);
        if (city) {
          return { type: "city", city, countyName: county.name };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching neighborhoods data:", error);
    return null;
  }
}

/**
 * The City document, for `region` and `coordinates`.
 *
 * `cities.region` is the marketing region ("Coachella Valley", "Inland Empire
 * & Desert"), which is NOT the same thing as the directory tree's top tier
 * ("Southern California"). It is the value the copy needs: the FAQ used to
 * assert that every city was "in the Coachella Valley", which was shipped on
 * Riverside, Los Angeles and ~200 other pages where it is simply false.
 */
async function getCityDoc(slug: string) {
  await dbConnect();
  return City.findOne({ slug }).lean().exec();
}

/**
 * Stats + gate for a city, in one call.
 *
 * Both generateMetadata and the page component need these, and Next.js runs
 * them as two separate invocations. getMarketStats() caches in-process for 6h,
 * so the second call costs nothing — but it must be the SAME call, or the
 * robots tag and the rendered page could disagree about whether the page is
 * worth indexing.
 */
async function getCitySeo(
  cityName: string,
  slug: string,
  regionName?: string | null,
): Promise<{
  stats: MarketStats | null;
  gate: IndexabilityResult;
}> {
  const stats = await getMarketStats({ scope: "city", name: cityName });
  // regionName drives the staged rollout (SEO_ROLLOUT_REGIONS) as well as the
  // copy. Unset by default, so this is a no-op until someone stages a batch.
  const gate = getCityIndexability(stats, regionName);
  return { stats, gate };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cityId: string }>;
}): Promise<Metadata> {
  const { cityId } = await params;
  const baseUrl = await getBaseUrlFromHeaders();

  const pageData = await getPageData(cityId);

  if (!pageData) {
    return {
      title: "Not Found",
      description: "The requested page could not be found.",
      robots: { index: false, follow: false },
    };
  }

  if (pageData.type === "city" && pageData.city) {
    const cityName = pageData.city.name;
    // The City document has to land BEFORE the gate runs, because the gate
    // reads the region for the staged rollout. Still one round trip each.
    const cityDoc = await getCityDoc(cityId);
    const regionName = (cityDoc as any)?.region;
    const { stats, gate } = await getCitySeo(cityName, cityId, regionName);

    // The headline count is residential FOR SALE, not cities.listingCount.
    // Putting the all-types number in the title was the origin of the "818
    // active" / "571 active" contradiction the audit found on Riverside.
    const activeCount = stats?.activeCount ?? 0;
    const title = activeCount
      ? `${cityName} Homes for Sale | ${activeCount.toLocaleString()} Active Listings`
      : `${cityName}, CA Real Estate & Homes for Sale`;

    const descParts: string[] = [];
    if (activeCount) {
      descParts.push(`${activeCount.toLocaleString()} homes for sale in ${cityName}, CA`);
    } else {
      descParts.push(`Homes for sale in ${cityName}, CA`);
    }
    if (stats?.medianClosePrice != null) {
      descParts.push(
        `Median sale price $${Math.round(stats.medianClosePrice).toLocaleString()}`,
      );
    }
    if (stats?.medianDaysOnMarket != null) {
      descParts.push(`${Math.round(stats.medianDaysOnMarket)} days on market`);
    }
    descParts.push("See current listings, prices and market trends.");

    return buildPlaceMetadata({
      title,
      description: descParts.join(". "),
      canonical: `${baseUrl}/neighborhoods/${cityId}`,
      image: placeOgImageUrl(baseUrl, {
        name: cityName,
        region: regionName,
        activeCount: stats?.activeCount,
        medianPrice: stats?.medianListPrice,
      }),
      imageAlt: `${cityName}, California homes for sale`,
      index: gate.index,
    });
  }

  if (pageData.type === "county" && pageData.county) {
    const label = formatCountyLabel(pageData.county.name);
    const citiesCount = pageData.county.cities.length;
    return buildPlaceMetadata({
      title: `${label} Real Estate | Homes for Sale by City`,
      description: `Browse homes for sale across ${citiesCount} cities in ${label}, California, with listing counts and median prices for each market.`,
      canonical: `${baseUrl}/neighborhoods/${cityId}`,
      image: placeOgImageUrl(baseUrl, { name: label, region: "California" }),
      imageAlt: `${label}, California real estate`,
    });
  }

  if (pageData.type === "region" && pageData.region) {
    const countiesCount = pageData.region.counties.length;
    return buildPlaceMetadata({
      title: `${pageData.region.name} Real Estate | Homes for Sale by County`,
      description: `Browse homes for sale across ${countiesCount} counties in ${pageData.region.name}, with listing counts and local market data for every city.`,
      canonical: `${baseUrl}/neighborhoods/${cityId}`,
      image: placeOgImageUrl(baseUrl, { name: pageData.region.name, region: "California" }),
      imageAlt: `${pageData.region.name} real estate`,
    });
  }

  return {
    title: "California Real Estate",
    description: "Find your perfect home in California",
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const resolvedParams = await params;
  const { cityId } = resolvedParams;

  const pageData = await getPageData(cityId);

  if (!pageData) {
    notFound();
  }

  // ── Region hub ────────────────────────────────────────────────────────────
  // Was a bare grid of counties with no server-rendered anchors to the cities
  // underneath, so the region tier passed nothing down. Every city in the
  // region is linked now, which is what makes "reachable within 3 clicks of
  // the homepage" true: home → region → city.
  if (pageData.type === "region" && pageData.region) {
    const RegionCountyGrid =
      require("@/app/components/neighborhoods/RegionCountyGrid").default;
    const region = pageData.region;
    const cityLinks = region.counties.flatMap((county) =>
      county.cities.map((city) => ({
        href: `/neighborhoods/${city.slug}`,
        label: city.name,
        meta: city.listings || undefined,
      })),
    );
    return (
      <>
        <RegionCountyGrid region={region} />
        <CrawlableLinks
          title={`Cities in ${region.name}`}
          description={`${cityLinks.length.toLocaleString()} cities with active listings`}
          links={cityLinks}
        />
      </>
    );
  }

  // ── County hub ────────────────────────────────────────────────────────────
  if (pageData.type === "county" && pageData.county) {
    const CountyCityGrid =
      require("@/app/components/neighborhoods/CountyCityGrid").default;
    const county = pageData.county;
    const cityLinks = county.cities.map((city) => ({
      href: `/neighborhoods/${city.slug}`,
      label: city.name,
      meta: city.listings || undefined,
    }));
    return (
      <>
        <CountyCityGrid county={county} regionSlug={pageData.region?.slug} />
        <CrawlableLinks
          title={`Cities in ${formatCountyLabel(county.name)}`}
          description={`${cityLinks.length.toLocaleString()} cities with active listings`}
          links={cityLinks}
        />
      </>
    );
  }

  // ── City page ─────────────────────────────────────────────────────────────
  if (pageData.type === "city" && pageData.city) {
    const { city: cityData, countyName } = pageData;
    const city = { ...cityData, id: cityId };

    const cityDoc: any = await getCityDoc(cityId);
    const regionName: string | undefined = cityDoc?.region;

    const serializedCityDoc = cityDoc
      ? {
          ...cityDoc,
          _id: cityDoc._id.toString(),
          createdAt: cityDoc.createdAt?.toISOString() || null,
          updatedAt: cityDoc.updatedAt?.toISOString() || null,
          lastUpdated: cityDoc.lastUpdated?.toISOString() || null,
        }
      : null;

    const baseUrl = await getBaseUrlFromHeaders();
    const { stats, gate } = await getCitySeo(cityData.name, cityId, regionName);
    logIndexability("city", cityId, gate);

    // Everything else can run in parallel — none of it depends on the others.
    const [listingLinks, nearbyCities] = await Promise.all([
      getCityListingLinks(cityData.name, LISTING_LINK_LIMIT),
      getNearbyCityLinks(cityData.name, 6),
    ]);

    // initialStats feeds the existing client stats widget. It now carries the
    // RESIDENTIAL FOR-SALE figures from market-stats rather than the all-types
    // roll-up on the city document, so the tiles agree with the title, the
    // meta description and the prose. The percentile range replaces min/max for
    // the same reason: one $1,300 rental row was turning Indio's range into
    // "$1k – $5.9M".
    const initialStats = stats
      ? {
          listingCount: stats.activeCount,
          avgPrice: stats.medianListPrice ?? 0,
          medianPrice: stats.medianListPrice ?? 0,
          priceRange: {
            min: stats.listPriceP10 ?? 0,
            max: stats.listPriceP90 ?? 0,
          },
        }
      : {
          listingCount: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
        };

    // "Neighborhoods in {City}" is suppressed below three entries.
    //
    // Riverside listed exactly one: "Non-HOA Riverside" — an MLS catch-all for
    // everything without an association, presented as though it were a
    // neighborhood. A heading promising neighborhoods above a single
    // placeholder is worse than no section: it reads as a broken page and it is
    // the kind of near-empty block that makes a template look auto-generated.
    // getNeighborhoodsDirectory() has already dropped the "Not Applicable"
    // class of filler via NON_PLACE_SUBDIVISION_NAMES.
    const MIN_SUBDIVISIONS_TO_LIST = 3;
    const allSubdivisions = cityData.subdivisions || [];
    const subdivisionLinks =
      allSubdivisions.length >= MIN_SUBDIVISIONS_TO_LIST
        ? allSubdivisions.map((sub: any) => ({
            href: `/neighborhoods/${cityId}/${sub.slug}`,
            label: sub.name,
            meta: sub.listings || undefined,
          }))
        : [];

    const faqs = getCityFaqs({
      cityName: cityData.name,
      regionName,
      stats,
      // Same floor as the link block: naming "Non-HOA Riverside" as a popular
      // neighborhood in an FAQ answer is a worse claim than omitting the
      // question, and getCityFaqs drops the question below three entries.
      topSubdivisions: allSubdivisions.slice(0, 5),
    });

    const countyLabel = formatCountyLabel(countyName!);
    const breadcrumbItems = [
      { name: "Home", url: baseUrl },
      { name: "Neighborhoods", url: `${baseUrl}/neighborhoods` },
      // The county tier was missing from the breadcrumb trail even though the
      // page links to it — so the declared hierarchy and the rendered one
      // disagreed.
      ...(countyName
        ? [
            {
              name: countyLabel,
              url: `${baseUrl}/neighborhoods/${createSlug(countyName)}-county`,
            },
          ]
        : []),
      { name: cityData.name, url: `${baseUrl}/neighborhoods/${cityId}` },
    ];

    // Hand-curated local notes. These exist for the ~20 Coachella Valley
    // cities and are genuinely specific (festivals, Mello-Roos exposure, IID
    // electricity rates). The OTHER source — src/data/city-content-generated.json
    // — is deliberately NOT read any more: its `about` text opened with a
    // verbatim Wikipedia paragraph (the file still carries the `wikiExtract`
    // field it was lifted from) and closed with "contact Joseph", and it baked
    // a STALE listing count into the prose, which is where Riverside's
    // "571 active listings" came from while the live stats said 709. The
    // data-driven paragraphs in MarketStatsBlock replace it, and they cannot go
    // stale because they are computed per request.
    const curatedAbout = coachellaValleyCities.find((c) => c.id === cityId)?.about;

    return (
      <>
        <FaqJsonLd faqs={faqs} />
        <BreadcrumbJsonLd items={breadcrumbItems} />
        <PlaceJsonLd
          type="City"
          name={cityData.name}
          description={
            stats?.medianClosePrice != null
              ? `${cityData.name}, California. ${stats.activeCount.toLocaleString()} homes for sale, median sale price $${Math.round(stats.medianClosePrice).toLocaleString()}.`
              : `${cityData.name}, California real estate.`
          }
          url={`${baseUrl}/neighborhoods/${cityId}`}
          latitude={cityDoc?.coordinates?.latitude}
          longitude={cityDoc?.coordinates?.longitude}
          regionName={regionName}
        />

        <CityPageClient
          city={city}
          countyName={countyName!}
          countyLabel={countyLabel}
          cityId={cityId}
          cityDoc={serializedCityDoc}
          initialStats={initialStats}
          regionName={regionName}
          curatedAbout={curatedAbout}
        />

        {/* Server-rendered, so the numbers that make this page unique are in
            the initial HTML rather than behind a client fetch. */}
        <div className="mx-auto max-w-7xl space-y-8 px-4 pb-8">
          {stats ? (
            <MarketStatsBlock stats={stats} placeName={cityData.name} />
          ) : null}
          {/* Renders only outside the agent's declared service areas. ~224 of
              the ~230 city pages were claiming local expertise in markets the
              agent does not work; this states what is actually on offer. */}
          <ServiceAreaNote cityName={cityData.name} regionName={regionName} />
          <FaqSection faqs={faqs} />
          <CityBuySellSections cityName={cityData.name} cityId={cityId} />
        </div>

        {nearbyCities.length > 0 ? (
          <CrawlableLinks
            title={`Nearby cities${regionName ? ` in the ${regionName}` : ""}`}
            links={nearbyCities}
            columns={3}
          />
        ) : null}

        {subdivisionLinks.length > 0 ? (
          <CrawlableLinks
            title={`Neighborhoods in ${cityData.name}`}
            links={subdivisionLinks}
            columns={4}
          />
        ) : null}

        <CrawlableLinks
          title={`Homes for sale in ${cityData.name}`}
          // An honest count. This block renders at most LISTING_LINK_LIMIT
          // anchors; labelling it "818 active listings" while showing 250 links
          // is a claim the page does not back up, and a visitor counting them
          // finds the gap immediately.
          description={
            stats && stats.activeCount > listingLinks.length
              ? `Showing ${listingLinks.length.toLocaleString()} of ${stats.activeCount.toLocaleString()} active listings`
              : `${listingLinks.length.toLocaleString()} active listings`
          }
          links={listingLinks}
          columns={3}
        />
      </>
    );
  }

  // Fallback - should never reach here
  notFound();
}
