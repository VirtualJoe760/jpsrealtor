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
      url: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about",
      width: 1200,
      height: 630,
    },
    image: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about",
    telephone: "+1-760-333-3676",
    email: "joseph@jpsrealtor.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Indian Wells",
      addressRegion: "CA",
      postalCode: "92253",
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
      "https://www.instagram.com/instadella",
      "https://www.yelp.com/biz/joseph-sardella-exp-realty-indian-wells",
      "https://www.obsidianregroup.com/team/joseph-sardella",
    ],
    memberOf: {
      "@type": "Organization",
      name: "eXp Realty",
      url: "https://exprealty.com",
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Real Estate License",
      recognizedBy: {
        "@type": "Organization",
        name: "California Department of Real Estate",
      },
      identifier: "DRE# 02106916",
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
    image: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about",
    url: "https://jpsrealtor.com/about",
    sameAs: [
      "https://www.instagram.com/instadella",
    ],
    worksFor: {
      "@type": "Organization",
      name: "eXp Realty - Obsidian Real Estate Group",
      url: "https://www.obsidianregroup.com",
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Real Estate License",
      recognizedBy: {
        "@type": "Organization",
        name: "California Department of Real Estate",
      },
      identifier: "DRE# 02106916",
    },
    knowsAbout: [
      "Real Estate",
      "Coachella Valley",
      "Palm Desert",
      "Indian Wells",
      "La Quinta",
      "Home Buying",
      "Home Selling",
      "Luxury Real Estate",
      "Investment Properties",
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
