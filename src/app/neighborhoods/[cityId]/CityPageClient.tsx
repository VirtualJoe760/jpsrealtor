"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import CityMap from "@/app/components/cities/CityMap";
import CityStats from "@/app/components/cities/CityStats";
import SubdivisionsSection from "@/app/components/cities/SubdivisionsSection";
import HOASection from "@/app/components/cities/HOASection";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import { coachellaValleyCities } from "@/app/constants/cities";

interface CityPageClientProps {
  city: {
    id: string;
    name: string;
    description?: string;
    population?: number;
  };
  countyName: string;
  cityId: string;
  cityDoc: any;
  initialStats: any;
}

export default function CityPageClient({
  city,
  countyName,
  cityId,
  cityDoc,
  initialStats,
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

  // Check if city is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/user/favorite-communities');
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

  // Helper to create slug from name
  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Get back link for city page - goes to county
  const countySlug = createSlug(countyName) + '-county';

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4" data-page="neighborhoods-city">
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
          <span className="text-sm font-medium">Back to {countyName}</span>
        </Link>

        {/* Hero Section */}
        <div className="mb-8">
          <p className={`text-sm ${textMuted} mb-2 flex items-center gap-2`}>
            <span>{countyName}</span>
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4 drop-shadow-2xl`}>
                {city.name} Homes for Sale
              </h1>
              {city.description && (
                <p className={`text-xl ${textSecondary} leading-relaxed max-w-3xl`}>
                  {city.description}
                </p>
              )}
              {city.population && (
                <p className={`text-lg ${textMuted} mt-3`}>
                  Population:{" "}
                  <span className={`font-semibold ${textPrimary}`}>
                    {city.population.toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            {/* Favorite Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleFavorite}
              disabled={isLoading}
              className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
                isFavorite
                  ? "bg-red-500/20 border-2 border-red-500"
                  : isLight
                    ? "bg-gray-200/80 border-2 border-gray-300 hover:border-red-500/50 backdrop-blur-sm"
                    : "bg-gray-800/50 border-2 border-gray-700 hover:border-red-500/50"
              }`}
              title={isFavorite ? "Remove from Communities" : "Add to Communities"}
            >
              <Heart
                className={`w-7 h-7 md:w-8 md:h-8 transition-all ${
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

        {/* Content */}
        <div className="space-y-8">
          {/* Map View */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
            <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6`}>
              Listings in {city.name}
            </h2>

            <CityMap
              cityId={cityId}
              cityName={city.name}
              coordinates={cityDoc?.coordinates}
              height="600px"
            />
          </div>

          {/* Stats with Auto-Cycling */}
          <CityStats cityId={cityId} initialStats={initialStats} />

          {/* About City — SEO content from city constants */}
          {(() => {
            const cityInfo = coachellaValleyCities.find(c => c.id === cityId);
            if (!cityInfo?.about) return null;
            return (
              <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
                <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-4`}>
                  About {city.name} Real Estate
                </h2>
                <div className={`text-base leading-relaxed ${textSecondary} space-y-4`}>
                  {cityInfo.about.split('. ').reduce((acc: string[][], sentence, i) => {
                    // Group sentences into paragraphs of ~3 sentences
                    const paragraphIdx = Math.floor(i / 3);
                    if (!acc[paragraphIdx]) acc[paragraphIdx] = [];
                    acc[paragraphIdx].push(sentence);
                    return acc;
                  }, []).map((group: string[], idx: number) => (
                    <p key={idx}>{group.join('. ')}{group[group.length - 1]?.endsWith('.') ? '' : '.'}</p>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Dynamic Community Data Sections */}
          <SubdivisionsSection cityId={cityId} />
          <HOASection cityId={cityId} />

          {/* FAQ Section — matches FAQPage schema for rich snippets */}
          {(() => {
            const cityInfo = coachellaValleyCities.find(c => c.id === cityId);
            if (!cityInfo) return null;
            const faqs = [
              { q: `How much do homes cost in ${city.name}?`, a: `Home prices in ${city.name} vary widely depending on the neighborhood, property type, and amenities. Contact Joseph Sardella for a current market analysis tailored to your budget and preferences.` },
              { q: `Is ${city.name} a good place to buy a home?`, a: `${city.name} is a popular choice for homebuyers in the Coachella Valley, offering a mix of lifestyle amenities, climate, and community. Whether you're looking for a primary residence, vacation home, or investment property, ${city.name} has options across price ranges.` },
              { q: `What neighborhoods are popular in ${city.name}?`, a: `${city.name} has many desirable neighborhoods and gated communities, each with unique character and price points. Visit our ${city.name} neighborhoods page to explore subdivisions with listing counts, average prices, and community details.` },
              { q: `Do I need a real estate agent to buy in ${city.name}?`, a: `While not legally required, working with a local real estate agent gives you access to market expertise, negotiation skills, and off-market listings. Joseph Sardella specializes in ${city.name} and the broader Coachella Valley — call (760) 333-3676 for a free consultation.` },
            ];
            return (
              <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
                <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6`}>
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, idx) => (
                    <details key={idx} className={`group ${cardBorder} border rounded-lg`}>
                      <summary className={`flex items-center justify-between cursor-pointer p-4 font-semibold ${textPrimary} hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors`}>
                        {faq.q}
                        <span className="ml-2 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className={`px-4 pb-4 text-sm leading-relaxed ${textSecondary}`}>
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Branded Buy/Sell CTA Section */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-4 text-center`}>
              Ready to Make Your Move in {city.name}?
            </h2>
            <p className={`text-lg ${textSecondary} mb-8 text-center max-w-3xl mx-auto`}>
              Whether you're buying your dream home or selling your property, Joey
              Sardella is your trusted local expert in {city.name}.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${cityId}/buy`}
                className={`px-8 py-4 ${buttonPrimary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Buy a Home in {city.name}
              </Link>
              <Link
                href={`/neighborhoods/${cityId}/sell`}
                className={`px-8 py-4 ${buttonSecondary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Sell Your {city.name} Home
              </Link>
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
