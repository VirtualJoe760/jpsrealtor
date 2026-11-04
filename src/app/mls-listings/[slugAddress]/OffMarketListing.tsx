"use client";

// Off-market notice for a /mls-listings/<slug> URL whose listing is gone.
//
// Deliberately shows NOTHING about the property — no address, photos, price or
// facts. NAR's model IDX rules (adopted by CRMLS) prohibit displaying expired
// and withdrawn listings, and a missing listing may be either; we can't tell.
// What it does show is all ours to show: active listings nearby (IDX-permitted),
// the community, and the site owner's contact. See
// docs/listings/off-market-pages.md.

import Link from "next/link";
import { ArrowRight, Home, MapPin, Phone, Search } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import RelatedListings from "@/app/components/mls/RelatedListings";
import type { OffMarketContext } from "@/lib/listings/dead-listing-redirect";

const fmtPrice = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`;

/** First ~2 sentences, so the community blurb stays a teaser for its page. */
function shortBlurb(text?: string): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g);
  const out = sentences ? sentences.slice(0, 2).join(" ").trim() : clean;
  return out.length > 320 ? `${out.slice(0, 317).replace(/\s+\S*$/, "")}…` : out;
}

export default function OffMarketListing({ context }: { context: OffMarketContext }) {
  const { currentTheme, cardBg, cardBorder, textPrimary, textSecondary, shadow } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const { agent } = useAgentProfile();
  const firstName = agent.name.split(" ")[0] || agent.name;
  const digits = agent.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const phoneHref = `tel:+1${digits}`;
  // Profiles store phones raw ("7608336334"); show them the usual way.
  const phoneLabel = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : agent.phone;

  const { city, citySlug, subdivision } = context;
  const sub = subdivision;
  const subHref = sub ? `/neighborhoods/${sub.cityId}/${sub.slug}` : null;
  const blurb = shortBlurb(sub?.description);

  const primaryBtn = isLight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white";
  const secondaryBtn = isLight ? "bg-gray-100 hover:bg-gray-200 text-gray-800" : "bg-gray-800 hover:bg-gray-700 text-gray-200";

  return (
    <div className="min-h-screen pb-12">
      {/* Notice */}
      <div className="px-4 pt-12 md:pt-16">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 ${
              isLight ? "bg-amber-50" : "bg-amber-500/10"
            }`}
          >
            <Home className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-3`}>
            This home is no longer on the market
          </h1>
          <p className={`${textSecondary} text-base md:text-lg max-w-xl mx-auto`}>
            The listing you&apos;re looking for has been taken off the market.
            {city ? ` Here are homes for sale nearby in ${city}.` : " Browse what's for sale now below."}
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="px-4 mt-8">
        <div className={`max-w-3xl mx-auto ${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow}`}>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Have a real estate question?</h2>
          <p className={`${textSecondary} mb-4`}>
            Contact {firstName} for questions about this home, the neighborhood, or anything else real estate.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={phoneHref} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${primaryBtn}`}>
              <Phone className="w-4 h-4" />
              Call {phoneLabel}
            </a>
            <Link href="/book-appointment" className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${secondaryBtn}`}>
              Book a time
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Nearby active listings */}
      {city && (
        <div className="mt-4">
          <RelatedListings
            city={city}
            subdivisionName={sub?.name}
            excludeListingKey=""
            title={sub ? `Homes for sale in ${sub.name}` : `Homes for sale in ${city}`}
          />
        </div>
      )}

      {/* Community */}
      {sub && subHref && (
        <div className="px-4">
          <div className={`max-w-7xl mx-auto ${cardBg} ${cardBorder} border rounded-2xl overflow-hidden ${shadow} md:flex`}>
            {sub.photo && (
              <div className="md:w-2/5 h-48 md:h-auto bg-cover bg-center" style={{ backgroundImage: `url(${sub.photo})` }} aria-hidden="true" />
            )}
            <div className="p-6 md:p-8 flex-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? "text-blue-600" : "text-blue-400"}`}>
                About the community
              </p>
              <h2 className={`mt-1 text-2xl font-bold ${textPrimary}`}>{sub.name}</h2>
              <p className={`mt-1 text-sm flex items-center gap-1 ${textSecondary}`}>
                <MapPin className="w-4 h-4" /> {city}
              </p>
              {blurb && <p className={`mt-3 ${textSecondary}`}>{blurb}</p>}
              {(sub.listingCount || sub.medianPrice) ? (
                <div className="mt-4 flex gap-6">
                  {sub.listingCount ? (
                    <div>
                      <p className={`text-xl font-bold ${textPrimary}`}>{sub.listingCount}</p>
                      <p className={`text-xs ${textSecondary}`}>homes for sale</p>
                    </div>
                  ) : null}
                  {sub.medianPrice ? (
                    <div>
                      <p className={`text-xl font-bold ${textPrimary}`}>{fmtPrice(sub.medianPrice)}</p>
                      <p className={`text-xs ${textSecondary}`}>median list price</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Link href={subHref} className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${primaryBtn}`}>
                See {sub.name}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Fallback links */}
      <div className="px-4 mt-8">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/mls-listings" className={`${cardBg} ${cardBorder} border rounded-xl p-5 ${shadow} block hover:scale-[1.02] transition-transform`}>
            <span className={`flex items-center gap-2 text-lg font-semibold ${textPrimary}`}>
              <Search className="w-5 h-5 text-blue-500" /> Search all listings
            </span>
          </Link>
          <Link
            href={citySlug ? `/neighborhoods/${citySlug}` : "/neighborhoods"}
            className={`${cardBg} ${cardBorder} border rounded-xl p-5 ${shadow} block hover:scale-[1.02] transition-transform`}
          >
            <span className={`flex items-center gap-2 text-lg font-semibold ${textPrimary}`}>
              <MapPin className="w-5 h-5 text-emerald-500" /> {city && citySlug ? `Explore ${city}` : "Explore neighborhoods"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
