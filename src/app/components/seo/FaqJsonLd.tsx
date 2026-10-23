// FAQ structured data + the visible FAQ it describes, for place pages.
//
// ── Two defects this file replaced ───────────────────────────────────────────
//
// 1. THE ANSWERS WERE THE SAME ON EVERY CITY. Only the city name was
//    interpolated. "How much do homes cost in {City}?" answered "prices vary
//    widely depending on the neighborhood, property type, and amenities —
//    contact Joseph for a current market analysis", which is the question
//    restated as a refusal. Repeat that across ~230 cities and the FAQ block is
//    pure duplicate content attached to the one query shape with the clearest
//    commercial intent. Answers are now assembled from the computed market
//    numbers, so they differ per city because the market does.
//
// 2. THE JSON-LD DID NOT MATCH THE PAGE. getCityFaqs() produced five Q&As for
//    the FAQPage schema while CityPageClient rendered its own hardcoded FOUR,
//    with different wording. Structured data that is not visible on the page is
//    a rich-results violation and can cost the whole site its enhancements. The
//    FAQs are now built once, server-side, and both the schema and the visible
//    <details> list render from that same array.
//
// Also gone: "in the Coachella Valley", which appeared in two answers and was
// shipped on Riverside, Los Angeles and every other out-of-area page. Region is
// a parameter now (`cities.region` — "Inland Empire & Desert" for Riverside).

import type { MarketStats } from "@/lib/market-stats";
import { formatPrice } from "@/lib/market-stats";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  faqs: FaqItem[];
}

export function FaqJsonLd({ faqs }: FaqJsonLdProps) {
  // Emitting FAQPage with no entries produces an invalid node, and emitting it
  // for boilerplate answers is what made it worthless before. No FAQs, no
  // schema.
  if (!faqs.length) return null;

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

/**
 * The visible FAQ. A server component, so the answers are in the initial HTML
 * and therefore identical to what FaqJsonLd declares.
 */
export function FaqSection({ faqs, heading = "Frequently Asked Questions" }: {
  faqs: FaqItem[];
  heading?: string;
}) {
  if (!faqs.length) return null;
  return (
    <section
      aria-labelledby="faq-heading"
      className="rounded-2xl border border-neutral-200 bg-white/60 p-6 md:p-8 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2
        id="faq-heading"
        className="mb-6 text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50"
      >
        {heading}
      </h2>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-neutral-900 dark:text-neutral-100">
              {faq.question}
              <span className="ml-2 text-neutral-400 transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            {/* Not hidden behind the toggle for crawlers: <details> content is
                in the DOM either way, which is why this pattern is safe where a
                JS-built accordion would not be. */}
            <div className="px-4 pb-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export interface CityFaqInput {
  cityName: string;
  /** `cities.region`, e.g. "Coachella Valley" or "Inland Empire & Desert". */
  regionName?: string;
  stats: MarketStats | null;
  /** Top subdivisions by listing count, already filtered of MLS filler names. */
  topSubdivisions?: { name: string; listings?: number }[];
  agentName?: string;
  agentPhone?: string;
}

/** "a, b and c" — Oxford-free, which is how the answers read best aloud. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * FAQs answered from the data.
 *
 * Every question is emitted ONLY when the numbers behind it exist. A question
 * whose answer would have to fall back to "contact us" is omitted entirely —
 * that fallback is exactly the boilerplate this replaces, and a four-question
 * FAQ that answers things beats a five-question one that does not.
 */
export function getCityFaqs(input: CityFaqInput): FaqItem[] {
  const {
    cityName,
    regionName,
    stats,
    topSubdivisions = [],
    agentName = "Joseph Sardella",
    agentPhone = "(760) 333-3676",
  } = input;

  const faqs: FaqItem[] = [];
  // Trailing comma included so the appositive closes: "Current inventory in
  // Riverside, in California's Inland Empire & Desert, breaks down as..." —
  // without it the clause ran straight into the verb.
  const area = regionName
    ? `${cityName}, in California's ${regionName},`
    : cityName;

  if (stats?.medianClosePrice != null || stats?.medianListPrice != null) {
    const parts: string[] = [];
    if (stats.medianClosePrice != null) {
      parts.push(
        `Homes in ${cityName} sold for a median of ${formatPrice(stats.medianClosePrice)} over the past 12 months`,
      );
    }
    if (stats.medianListPrice != null) {
      parts.push(
        `${parts.length ? "and the" : "The"} median asking price on the ${stats.activeCount.toLocaleString()} homes currently for sale is ${formatPrice(stats.medianListPrice)}`,
      );
    }
    let answer = `${parts.join(" ")}.`;
    if (stats.medianClosePricePerSqFt != null) {
      answer += ` That works out to roughly $${Math.round(stats.medianClosePricePerSqFt)} per square foot.`;
    }
    if (stats.listPriceP10 != null && stats.listPriceP90 != null) {
      answer += ` Most listings fall between ${formatPrice(stats.listPriceP10)} and ${formatPrice(stats.listPriceP90)}.`;
    }
    faqs.push({ question: `How much do homes cost in ${cityName}?`, answer });
  }

  if (stats && (stats.medianDaysOnMarket != null || stats.monthsOfSupply != null)) {
    const bits: string[] = [];
    if (stats.monthsOfSupply != null) {
      const mos = stats.monthsOfSupply;
      const tone =
        mos < 4
          ? "favours sellers"
          : mos > 7
            ? "favours buyers"
            : "is roughly balanced between buyers and sellers";
      bits.push(
        `At ${mos.toFixed(1)} months of supply, the market ${tone} by the usual six-month benchmark`,
      );
    }
    if (stats.medianDaysOnMarket != null) {
      bits.push(
        `homes take a median of ${Math.round(stats.medianDaysOnMarket)} days to sell`,
      );
    }
    if (stats.saleToListPercent != null) {
      // No leading "and" here: joinList already supplies the conjunction
      // before the final item, and both together produced "...to sell and and
      // close at 100% of asking price."
      bits.push(`close at ${stats.saleToListPercent}% of asking price`);
    }
    let answer = `${joinList(bits)}.`;
    if (stats.yoyMedianPricePercent != null && Math.abs(stats.yoyMedianPricePercent) >= 0.5) {
      const dir = stats.yoyMedianPricePercent > 0 ? "up" : "down";
      answer += ` The median sale price is ${dir} ${Math.abs(stats.yoyMedianPricePercent).toFixed(1)}% year over year.`;
    }
    faqs.push({ question: `Is ${cityName} a good place to buy a home?`, answer });
  }

  if (topSubdivisions.length >= 3) {
    const names = topSubdivisions.slice(0, 5).map((s) => s.name);
    faqs.push({
      question: `What neighborhoods are popular in ${cityName}?`,
      answer: `${cityName}'s most active communities by current listing count are ${joinList(
        names,
      )}. Each has its own page with listings, HOA details and sold history.`,
    });
  }

  if (stats && stats.inventoryByType.length > 0) {
    const split = stats.inventoryByType
      .map((t) => `${t.count} ${t.label.toLowerCase()}`)
      .join(", ");
    faqs.push({
      question: `What kinds of property are for sale in ${cityName}?`,
      answer: `Current inventory in ${area} breaks down as ${split}. Rentals are listed separately and are not included in these counts.`,
    });
  }

  // The one answer that is not data-derived, kept because it is the question
  // buyers actually ask and the answer is genuinely the same everywhere. It
  // names the region as a variable rather than asserting Coachella Valley.
  faqs.push({
    question: `Do I need a real estate agent to buy in ${cityName}?`,
    answer: `It is not legally required, but a local agent brings market data, negotiation and access to listings before they are widely marketed. ${agentName} works across ${
      regionName || "California"
    } — call ${agentPhone} for a free consultation.`,
  });

  return faqs;
}
