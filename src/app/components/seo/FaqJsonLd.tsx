// FAQ JSON-LD Schema for city landing pages
// Generates FAQPage structured data for rich snippets in SERPs.
// getCityFaqs is now domain-aware — callers pass agentName/phone for
// agent custom domains, or omit them to get defaults.

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  faqs: FaqItem[];
}

export function FaqJsonLd({ faqs }: FaqJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// Pre-built FAQ sets for Coachella Valley cities.
// Pass agentName / agentPhone to personalise for agent domains.
export function getCityFaqs(
  cityName: string,
  listingCount?: number,
  agentName: string = "Joseph Sardella",
  agentPhone: string = "(760) 333-3676",
): FaqItem[] {
  const count = listingCount ? listingCount.toLocaleString() : "hundreds of";

  return [
    {
      question: `How much do homes cost in ${cityName}?`,
      answer: `Home prices in ${cityName} vary widely depending on the neighborhood, property type, and amenities. Contact ${agentName} for a current market analysis tailored to your budget and preferences.`,
    },
    {
      question: `Is ${cityName} a good place to buy a home?`,
      answer: `${cityName} is a popular choice for homebuyers in the Coachella Valley, offering a mix of lifestyle amenities, climate, and community. Whether you're looking for a primary residence, vacation home, or investment property, ${cityName} has options across price ranges.`,
    },
    {
      question: `How many homes are for sale in ${cityName} right now?`,
      answer: `There are currently ${count} active listings in ${cityName}. New listings are added daily — browse the latest on our interactive map or contact ${agentName} for off-market opportunities.`,
    },
    {
      question: `What neighborhoods are popular in ${cityName}?`,
      answer: `${cityName} has many desirable neighborhoods and gated communities, each with unique character and price points. Visit our ${cityName} neighborhoods page to explore subdivisions with listing counts, average prices, and community details.`,
    },
    {
      question: `Do I need a real estate agent to buy in ${cityName}?`,
      answer: `While not legally required, working with a local real estate agent gives you access to market expertise, negotiation skills, and off-market listings. ${agentName} specializes in ${cityName} and the broader Coachella Valley — call ${agentPhone} for a free consultation.`,
    },
  ];
}
