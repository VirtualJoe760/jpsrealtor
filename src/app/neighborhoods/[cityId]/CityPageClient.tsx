"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, ChevronLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import CityMap from "@/app/components/cities/CityMap";
import CityStats from "@/app/components/cities/CityStats";
import SubdivisionsSection from "@/app/components/cities/SubdivisionsSection";
import HOASection from "@/app/components/cities/HOASection";
import NeighborhoodErrorBoundary from "@/app/components/neighborhoods/NeighborhoodErrorBoundary";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import { createSlug } from "@/lib/utils/slug";
import { trackViewCity } from "@/lib/meta-pixel";

interface CityPageClientProps {
  city: {
    id: string;
    name: string;
    description?: string;
    population?: number;
  };
  countyName: string;
  /**
   * The county as a reader should see it. `countyName` is the directory's
   * internal label and is also used to build the slug, so it stays; this is
   * the display form. The back-link on the Riverside page read "Back to
   * Riverside" while pointing at the COUNTY page, which is a different place
   * with the same name — the single most confusing link on that page.
   */
  countyLabel: string;
  cityId: string;
  cityDoc: any;
  initialStats: any;
  /** `cities.region`, e.g. "Coachella Valley" — NOT assumed, passed in. */
  regionName?: string;
  /**
   * Hand-curated local notes, where they exist. The server decides what counts
   * as curated; this component only renders what it is given. Generated
   * `about` text is no longer passed at all — see the note in page.tsx.
   */
  curatedAbout?: string;
}

export default function CityPageClient({
  city,
  countyName,
  countyLabel,
  cityId,
  cityDoc,
  initialStats,
  regionName,
  curatedAbout,
}: CityPageClientProps) {
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Theme support
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Theme-based classes
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textSecondary = isLight ? "text-gray-600" : "text-gray-400";
  const textMuted = isLight ? "text-gray-500" : "text-gray-500";
  const cardBg = isLight ? "bg-white" : "bg-gray-800";
  const cardBorder = isLight ? "border-gray-200" : "border-gray-700";
  const shadow = isLight ? "shadow-lg" : "shadow-xl shadow-black/20";
  const buttonPrimary = isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600";
  const buttonSecondary = isLight ? "bg-gray-200 text-gray-900 hover:bg-gray-300" : "bg-gray-700 text-white hover:bg-gray-600";

  // Track city view for retargeting. City pages carried no pixel event at all,
  // so the market-level intent signal (someone browsing Palm Desert) never
  // reached an audience even though the base pixel was loading fine.
  useEffect(() => {
    trackViewCity({
      name: city.name,
      county: countyName,
      listingCount: initialStats?.listingCount,
    });
  }, [city.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if city is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/user/favorite-communities', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const favorite = data.communities?.find(
            (c: any) => c.id === cityId && c.type === 'city'
          );
          setIsFavorite(!!favorite);
        }
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [session?.user?.email, cityId]);

  const toggleFavorite = async () => {
    if (!session?.user?.email) {
      // Redirect to sign in
      window.location.href = '/auth/signin';
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/user/favorite-communities?id=${cityId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsFavorite(false);
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/user/favorite-communities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: city.name,
            id: cityId,
            type: 'city',
          }),
        });
        if (response.ok) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get back link for city page - goes to county
  const countySlug = createSlug(countyName) + '-county';

  return (
    <div className="min-h-screen pt-14 md:pt-8 px-4" data-page="neighborhoods-city">
      <div className="max-w-7xl mx-auto">
        {/* Back to County Button */}
        <Link
          href={`/neighborhoods/${countySlug}`}
          className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all ${
            isLight
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to {countyLabel}</span>
        </Link>

        {/* Hero Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${textPrimary} drop-shadow-2xl`}>
                {city.name}
              </h1>
              <h2 className={`text-xl md:text-2xl font-medium ${textSecondary} mt-1`}>
                {/* Region comes from `cities.region`, so it says "Inland Empire
                    & Desert" on Riverside instead of asserting Coachella
                    Valley the way the old templates did. */}
                Homes for Sale{regionName ? ` \u00b7 ${regionName}` : ""}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${city.name} Residential Listings`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  isLight
                    ? "bg-gray-200/80 border-2 border-gray-300 hover:border-blue-500/50 backdrop-blur-sm"
                    : "bg-gray-800/50 border-2 border-gray-700 hover:border-blue-500/50"
                }`}
                title="Share"
              >
                <Share2
                  className={`w-5 h-5 md:w-6 md:h-6 ${
                    isLight ? "text-gray-600" : "text-gray-400"
                  }`}
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleFavorite}
                disabled={isLoading}
                className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  isFavorite
                    ? "bg-red-500/20 border-2 border-red-500"
                    : isLight
                      ? "bg-gray-200/80 border-2 border-gray-300 hover:border-red-500/50 backdrop-blur-sm"
                      : "bg-gray-800/50 border-2 border-gray-700 hover:border-red-500/50"
                }`}
                title={isFavorite ? "Remove from Communities" : "Add to Communities"}
              >
                <Heart
                  className={`w-5 h-5 md:w-6 md:h-6 transition-all ${
                    isFavorite
                      ? "fill-red-500 text-red-500"
                      : isLight
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                />
              </motion.button>
            </div>
          </div>
          {city.description && (
            <p className={`text-lg ${textSecondary} leading-relaxed max-w-2xl mx-auto`}>
              {city.description}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Map View */}
          <NeighborhoodErrorBoundary sectionName="Map">
            <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
              <CityMap
                cityId={cityId}
                cityName={city.name}
                coordinates={cityDoc?.coordinates}
                height="600px"
              />
            </div>
          </NeighborhoodErrorBoundary>

          {/* Stats with Auto-Cycling */}
          <NeighborhoodErrorBoundary sectionName="Statistics">
            <CityStats cityId={cityId} initialStats={initialStats} />
          </NeighborhoodErrorBoundary>

          {/* About City — CURATED notes only.
              The old version fell back to src/data/city-content-generated.json
              whenever a city had no hand-written entry, which was ~270 of the
              ~293 cities. That text opened with a verbatim Wikipedia paragraph
              (the JSON still carries the `wikiExtract` field it came from),
              closed with "contact Joseph", and hardcoded a listing count that
              had gone stale — Riverside's said "571 active listings" while the
              live figure was 709. Original prose for those markets is a content
              task, not a template one; until it exists, the computed paragraphs
              in MarketStatsBlock carry the page and cannot go stale. */}
          {curatedAbout ? (
            <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
              <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-4`}>
                About {city.name} Real Estate
              </h2>
              <div className={`text-base leading-relaxed ${textSecondary} space-y-4`}>
                {curatedAbout.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          ) : null}

          {/* Dynamic Community Data Sections */}
          <NeighborhoodErrorBoundary sectionName="Subdivisions">
            <SubdivisionsSection cityId={cityId} />
          </NeighborhoodErrorBoundary>
          <NeighborhoodErrorBoundary sectionName="HOA Information">
            <HOASection cityId={cityId} />
          </NeighborhoodErrorBoundary>

          {/* The FAQ moved OUT of this component on 2026-10-14.
              It was hardcoded here with four Coachella-Valley-flavoured answers
              while components/seo/FaqJsonLd emitted FIVE differently worded ones
              into the FAQPage schema. Structured data that does not match the
              visible page is a rich-results violation, and two copies of the
              same block guarantee they drift. Both now render from a single
              server-built array — see FaqSection in page.tsx. */}

          {/* Branded Buy/Sell CTA Section */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-4 text-center`}>
              Ready to Make Your Move in {city.name}?
            </h2>
            {/* Was "Joey Sardella is your trusted local expert in {city}".
                This template renders on ~230 city pages, and the agent's
                declared service areas are six Coachella Valley cities — so on
                ~224 of them that sentence asserted local expertise in a market
                he does not work. ServiceAreaNote (rendered above, on
                out-of-area pages only) states how those markets are actually
                served; this line no longer contradicts it. */}
            <p className={`text-lg ${textSecondary} mb-8 text-center max-w-3xl mx-auto`}>
              Whether you&apos;re buying or selling in {city.name}, start with
              the numbers above — then tell us what you&apos;re trying to do.
            </p>
            {/* Anchors, not routes. These used to link to
                /neighborhoods/{city}/buy and /{city}/sell — two pages per city
                across ~230 cities whose only city-specific content was the
                title, the meta description and one heading. Those URLs now 301
                to these anchors, and the forms they held render further down
                this page. A plain <a> is correct for a same-page target; next/
                Link would push a history entry for a scroll. */}
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="#buy"
                className={`px-8 py-4 ${buttonPrimary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Buy a Home in {city.name}
              </a>
              <a
                href="#sell"
                className={`px-8 py-4 ${buttonSecondary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Sell Your {city.name} Home
              </a>
            </div>
            <p className={`text-sm ${textMuted} mt-6 text-center`}>
              Expert service • Local market knowledge • Proven results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
