// JSON-LD Structured Data for SEO
// Multi-domain aware: adapts output based on the serving hostname.

import { headers } from "next/headers"
import {
  getDomainConfig,
  type DomainSeoConfig,
} from "@/lib/domain-utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveConfig(): Promise<DomainSeoConfig> {
  const headersList = await headers()
  const host = headersList.get("host") || "chatrealty.io"
  return getDomainConfig(host)
}

// ---------------------------------------------------------------------------
// OrganizationJsonLd
// ---------------------------------------------------------------------------

export async function OrganizationJsonLd() {
  const cfg = await resolveConfig()

  // Platform domain — ChatRealty org
  if (cfg.type === "platform") {
    return <PlatformOrganizationJsonLd baseUrl={cfg.baseUrl} cfg={cfg} />
  }

  // Agent domain — RealEstateAgent enriched with the DOMAIN OWNER's real
  // identity. The old shell emitted getDomainConfig()'s un-enriched
  // placeholders (name "Real Estate Agent", no phone/license/sameAs), which
  // is worse than nothing for E-E-A-T. Falls back to the shell on any error.
  try {
    const { headers: h } = await import("next/headers")
    const headersList = await h()
    const host = headersList.get("host") || ""
    const { resolveDomainOwner } = await import("@/lib/resolveDomainOwner")
    const req = new Request(`https://${host || "chatrealty.io"}/`, {
      headers: headersList as unknown as HeadersInit,
    })
    const { ownerId } = await resolveDomainOwner(req)
    if (ownerId) {
      const dbConnect = (await import("@/lib/mongoose")).default
      await dbConnect()
      const User = (await import("@/models/User")).default
      const u: any = await User.findById(ownerId)
        .select(
          "name phone licenseNumber brokerageName " +
            "agentProfile.cellPhone agentProfile.officePhone agentProfile.licenseNumber " +
            // agentProfile.brokerage is the CURRENT model (name, legalName,
            // licenseNumber); brokerageName is the legacy field. This selected
            // only the legacy pair, so an agent migrated onto the new model
            // and with the old field empty emitted no brokerage at all — the
            // responsible broker missing from the one node that names it.
            "agentProfile.brokerage agentProfile.brokerageName " +
            "agentProfile.headshot agentProfile.socialMedia " +
            "agentProfile.serviceAreas agentProfile.metaDescription agentProfile.headline"
        )
        .lean()
      if (u?.name) {
        const ap = u.agentProfile || {}
        const sameAs = Object.values(ap.socialMedia || {}).filter(
          (v): v is string => typeof v === "string" && v.startsWith("http")
        )
        const license = ap.licenseNumber || u.licenseNumber
        const brk = ap.brokerage || {}
        // Newest model first, legacy as the migration fallback — the same
        // precedence as /api/agent-branding and components/SiteFooter.
        const brokerageName = brk.name || ap.brokerageName || u.brokerageName
        const brokerageLegalName = brk.legalName || brokerageName
        const structuredData: Record<string, unknown> = {
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "@id": `${cfg.baseUrl}/#organization`,
          name: u.name,
          description:
            ap.metaDescription || ap.headline || cfg.siteDescription,
          url: cfg.baseUrl,
          telephone: ap.cellPhone || ap.officePhone || u.phone || undefined,
          image: ap.headshot || undefined,
          ...(license && {
            identifier: {
              "@type": "PropertyValue",
              propertyID: "CA DRE License",
              value: license,
            },
          }),
          ...(sameAs.length > 0 && { sameAs }),
          // `parentOrganization`, not just `memberOf`. An agent does not
          // merely belong to a brokerage — the brokerage is the licensed
          // entity legally responsible for the agent's advertising, and
          // parentOrganization is the relation that states that. Both are
          // emitted: memberOf was here first and consumers may key on it.
          ...(brokerageName && {
            parentOrganization: {
              "@type": "RealEstateOrganization",
              name: brokerageName,
              ...(brokerageLegalName !== brokerageName && { legalName: brokerageLegalName }),
              ...(brk.licenseNumber && {
                identifier: {
                  "@type": "PropertyValue",
                  propertyID: "CA DRE License",
                  value: brk.licenseNumber,
                },
              }),
            },
            memberOf: {
              "@type": "RealEstateOrganization",
              name: brokerageName,
            },
          }),
          // NO street address: none is stored, and inventing one for a
          // RealEstateAgent node is a claim about a physical place of business
          // that a reviewer can check. State and country are both true and are
          // what actually disambiguates this agent from a same-named one
          // elsewhere.
          address: {
            "@type": "PostalAddress",
            addressRegion: "CA",
            addressCountry: "US",
          },
          // The service area is the STATE plus the named local markets. Listing
          // only the six Coachella Valley cities while the site publishes city
          // pages for ~230 California markets understated the scope to the one
          // consumer that reads this field literally.
          areaServed: [
            { "@type": "State", name: "California" },
            ...(Array.isArray(ap.serviceAreas)
              ? ap.serviceAreas
                  .map((a: any) => a?.name || a)
                  .filter(Boolean)
                  .slice(0, 20)
                  .map((name: string) => ({ "@type": "City", name }))
              : []),
          ],
        }
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )
      }
    }
  } catch {
    /* fall back to the generic shell below */
  }

  return <AgentOrganizationJsonLd baseUrl={cfg.baseUrl} cfg={cfg} />
}

function PlatformOrganizationJsonLd({ baseUrl, cfg }: { baseUrl: string; cfg: DomainSeoConfig }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: cfg.siteName,
    description: cfg.siteDescription,
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: cfg.logoUrl.startsWith("http") ? cfg.logoUrl : `${baseUrl}${cfg.logoUrl}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

function AgentOrganizationJsonLd({ baseUrl, cfg }: { baseUrl: string; cfg: DomainSeoConfig }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${baseUrl}/#organization`,
    name: cfg.siteName,
    description: cfg.siteDescription,
    url: baseUrl,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// ---------------------------------------------------------------------------
// PersonJsonLd
// ---------------------------------------------------------------------------

/**
 * PersonJsonLd is no longer emitted from this file.
 * Agent-specific structured data is enriched from the DB via getDomainConfigFromHeaders().
 * Kept as a no-op export to avoid breaking existing callers.
 */
export async function PersonJsonLd() {
  return null
}

// ---------------------------------------------------------------------------
// WebSiteJsonLd
// ---------------------------------------------------------------------------

export async function WebSiteJsonLd() {
  const cfg = await resolveConfig()

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${cfg.baseUrl}/#website`,
    url: cfg.baseUrl,
    name: cfg.siteName,
    description: cfg.siteDescription,
    publisher: { "@id": `${cfg.baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${cfg.baseUrl}/mls-listings?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// ---------------------------------------------------------------------------
// BreadcrumbJsonLd (unchanged — already receives URLs as props)
// ---------------------------------------------------------------------------

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// ---------------------------------------------------------------------------
// PropertyListingJsonLd (unchanged — already receives URLs as props)
// ---------------------------------------------------------------------------

interface PropertyListingJsonLdProps {
  name: string
  description: string
  price: number
  address: {
    streetAddress: string
    city: string
    state: string
    postalCode: string
  }
  image: string
  url: string
  bedrooms?: number
  bathrooms?: number
  floorSize?: number
}

export function PropertyListingJsonLd({
  name,
  description,
  price,
  address,
  image,
  url,
  bedrooms,
  bathrooms,
  floorSize,
}: PropertyListingJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name,
    description,
    url,
    image,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: address.streetAddress,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: "US",
    },
    ...(bedrooms && { numberOfRooms: bedrooms }),
    ...(bathrooms && { numberOfBathroomsTotal: bathrooms }),
    ...(floorSize && {
      floorSize: {
        "@type": "QuantitativeValue",
        value: floorSize,
        unitCode: "FTK",
      },
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// ---------------------------------------------------------------------------
// PlaceJsonLd (added 2026-10-14)
// ---------------------------------------------------------------------------
//
// City and subdivision pages previously emitted only BreadcrumbList. Nothing
// told Google WHAT the page was about as an entity — a page titled "Indio
// Homes for Sale" with no Place node is a document that mentions a city, not a
// page about that city. `geo` is the part that disambiguates: there is an Indio
// in California and one in Kentucky, and coordinates settle which.
//
// `City` and `Neighborhood` are both schema.org subtypes of Place, so the type
// is passed in rather than hardcoded — a subdivision is not a city and marking
// it as one is a false statement about the entity.

interface PlaceJsonLdProps {
  /** "City" for a municipality, "Neighborhood" for a subdivision. */
  type: "City" | "Neighborhood"
  name: string
  description?: string
  url: string
  /** Omitted entirely when absent — a Place with a null geo is worse than none. */
  latitude?: number
  longitude?: number
  /** The city a neighborhood sits inside, as a containment link. */
  containedIn?: { name: string; url: string }
  /** Region name from `cities.region`, e.g. "Coachella Valley". */
  regionName?: string
}

export function PlaceJsonLd({
  type,
  name,
  description,
  url,
  latitude,
  longitude,
  containedIn,
  regionName,
}: PlaceJsonLdProps) {
  const hasGeo =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    url,
    ...(description && { description }),
    ...(hasGeo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude,
        longitude,
      },
    }),
    ...(containedIn && {
      containedInPlace: {
        "@type": "City",
        name: containedIn.name,
        url: containedIn.url,
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: containedIn?.name || name,
      ...(regionName && { addressRegion: "CA" }),
      addressCountry: "US",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
