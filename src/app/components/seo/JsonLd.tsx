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
            "agentProfile.brokerageName agentProfile.headshot agentProfile.socialMedia " +
            "agentProfile.serviceAreas agentProfile.metaDescription agentProfile.headline"
        )
        .lean()
      if (u?.name) {
        const ap = u.agentProfile || {}
        const sameAs = Object.values(ap.socialMedia || {}).filter(
          (v): v is string => typeof v === "string" && v.startsWith("http")
        )
        const license = ap.licenseNumber || u.licenseNumber
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
          ...((ap.brokerageName || u.brokerageName) && {
            memberOf: {
              "@type": "RealEstateOrganization",
              name: ap.brokerageName || u.brokerageName,
            },
          }),
          ...(Array.isArray(ap.serviceAreas) && ap.serviceAreas.length > 0 && {
            areaServed: ap.serviceAreas
              .map((a: any) => a?.name || a)
              .filter(Boolean)
              .slice(0, 20)
              .map((name: string) => ({ "@type": "City", name })),
          }),
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
