// JSON-LD Structured Data for SEO
// This component adds schema.org structured data to help search engines understand the content

export function OrganizationJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": "https://jpsrealtor.com/#organization",
    name: "Joseph Sardella - JPS Realtor",
    alternateName: "JPS Realtor",
    description:
      "Buy, sell, or invest in the Palm Desert real estate market with Joseph Sardella, a local expert and trusted Realtor in the Coachella Valley.",
    url: "https://jpsrealtor.com",
    logo: {
      "@type": "ImageObject",
      url: "https://jpsrealtor.com/joey/about.png",
      width: 1200,
      height: 630,
    },
    image: "https://jpsrealtor.com/joey/about.png",
    telephone: "+1-760-XXX-XXXX", // Update with actual phone number
    email: "joseph@jpsrealtor.com", // Update with actual email
    address: {
      "@type": "PostalAddress",
      streetAddress: "", // Add street address if applicable
      addressLocality: "Palm Desert",
      addressRegion: "CA",
      postalCode: "92260",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 33.7222,
      longitude: -116.3745,
    },
    areaServed: [
      {
        "@type": "City",
        name: "Palm Desert",
        sameAs: "https://en.wikipedia.org/wiki/Palm_Desert,_California",
      },
      {
        "@type": "City",
        name: "Indian Wells",
        sameAs: "https://en.wikipedia.org/wiki/Indian_Wells,_California",
      },
      {
        "@type": "City",
        name: "La Quinta",
        sameAs: "https://en.wikipedia.org/wiki/La_Quinta,_California",
      },
      {
        "@type": "City",
        name: "Rancho Mirage",
        sameAs: "https://en.wikipedia.org/wiki/Rancho_Mirage,_California",
      },
      {
        "@type": "City",
        name: "Palm Springs",
        sameAs: "https://en.wikipedia.org/wiki/Palm_Springs,_California",
      },
      {
        "@type": "City",
        name: "Cathedral City",
        sameAs: "https://en.wikipedia.org/wiki/Cathedral_City,_California",
      },
      {
        "@type": "City",
        name: "Indio",
        sameAs: "https://en.wikipedia.org/wiki/Indio,_California",
      },
      {
        "@type": "City",
        name: "Coachella",
        sameAs: "https://en.wikipedia.org/wiki/Coachella,_California",
      },
      {
        "@type": "City",
        name: "Desert Hot Springs",
        sameAs: "https://en.wikipedia.org/wiki/Desert_Hot_Springs,_California",
      },
    ],
    priceRange: "$$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "10:00",
        closes: "16:00",
      },
    ],
    sameAs: [
      // Add social media profiles when available
      // "https://www.facebook.com/jpsrealtor",
      // "https://www.instagram.com/jpsrealtor",
      // "https://www.linkedin.com/in/josephsardella",
    ],
    memberOf: {
      "@type": "Organization",
      name: "eXp Realty",
      url: "https://exprealty.com",
    },
    knowsAbout: [
      "Real Estate",
      "Home Buying",
      "Home Selling",
      "Property Investment",
      "Coachella Valley Real Estate",
      "Palm Desert Real Estate",
      "Luxury Homes",
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function PersonJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": "https://jpsrealtor.com/#person",
    name: "Joseph Sardella",
    givenName: "Joseph",
    familyName: "Sardella",
    jobTitle: "Real Estate Agent",
    description:
      "Born and raised in Indian Wells Country Club, Joseph Sardella is a local real estate expert serving the Coachella Valley.",
    image: "https://jpsrealtor.com/joey/about.png",
    url: "https://jpsrealtor.com/about",
    sameAs: [
      // Add social profiles
    ],
    worksFor: {
      "@type": "Organization",
      name: "eXp Realty - Obsidian Real Estate Group",
    },
    knowsAbout: [
      "Real Estate",
      "Coachella Valley",
      "Palm Desert",
      "Home Buying",
      "Home Selling",
    ],
    alumniOf: {
      "@type": "Organization",
      name: "Apple Retail",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function WebSiteJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://jpsrealtor.com/#website",
    url: "https://jpsrealtor.com",
    name: "JPS Realtor - Joseph Sardella Real Estate",
    description:
      "Find your dream home in the Coachella Valley with Joseph Sardella, your trusted Palm Desert real estate agent.",
    publisher: {
      "@id": "https://jpsrealtor.com/#organization",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://jpsrealtor.com/mls-listings?q={search_term_string}",
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
        unitCode: "FTK", // Square feet
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
