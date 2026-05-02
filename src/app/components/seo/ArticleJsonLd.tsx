// Article JSON-LD Schema for blog/insights posts
// Multi-domain aware: resolves image/author URLs relative to the serving domain.

import { headers } from "next/headers"
import { getDomainConfig } from "@/lib/domain-utils"

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  section?: string;
}

export async function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
  section,
}: ArticleJsonLdProps) {
  const headersList = await headers()
  const host = headersList.get("host") || "chatrealty.io"
  const cfg = getDomainConfig(host)

  // Fall back to the domain config's default author for owner/platform domains
  const resolvedAuthor =
    authorName || cfg.siteName

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    ...(image && {
      image: {
        "@type": "ImageObject",
        url: image.startsWith("http") ? image : `${cfg.baseUrl}${image}`,
      },
    }),
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: resolvedAuthor,
      url: `${cfg.baseUrl}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: cfg.siteName,
      url: cfg.baseUrl,
      logo: {
        "@type": "ImageObject",
        url: cfg.logoUrl.startsWith("http") ? cfg.logoUrl : `${cfg.baseUrl}${cfg.logoUrl}`,
      },
    },
    ...(section && { articleSection: section }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
