// Article JSON-LD Schema for blog/insights posts

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

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName = "Joseph Sardella",
  section,
}: ArticleJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    ...(image && {
      image: {
        "@type": "ImageObject",
        url: image.startsWith("http") ? image : `https://jpsrealtor.com${image}`,
      },
    }),
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: authorName,
      url: "https://jpsrealtor.com/about",
    },
    publisher: {
      "@type": "Organization",
      name: "JPS Realtor",
      url: "https://jpsrealtor.com",
      logo: {
        "@type": "ImageObject",
        url: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about",
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
