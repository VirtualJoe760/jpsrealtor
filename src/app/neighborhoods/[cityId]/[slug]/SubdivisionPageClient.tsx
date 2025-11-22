"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import SubdivisionListings from "@/app/components/subdivisions/SubdivisionListings";
import SubdivisionPhotoCarousel from "@/app/components/subdivisions/SubdivisionPhotoCarousel";
import SubdivisionReviews from "@/app/components/subdivisions/SubdivisionReviews";
import SubdivisionForum from "@/app/components/subdivisions/SubdivisionForum";
import SubdivisionStats from "@/app/components/subdivisions/SubdivisionStats";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

// Dynamically import map component with no SSR
const SubdivisionMap = dynamic(
  () => import("@/app/components/subdivisions/SubdivisionMap"),
  { ssr: false }
);

interface SubdivisionPageClientProps {
  cityId: string;
  slug: string;
  subdivision: any;
}

export default function SubdivisionPageClient({
  cityId,
  slug,
  subdivision,
}: SubdivisionPageClientProps) {
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Theme support
  const {
    bgPrimary,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    buttonPrimary,
    buttonSecondary,
    shadow,
    border,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Check if subdivision is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/user/favorite-communities');
        if (response.ok) {
          const data = await response.json();
          const favorite = data.communities?.find(
            (c: any) => c.id === slug && c.type === 'subdivision'
          );
          setIsFavorite(!!favorite);
        }
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [session?.user?.email, slug]);

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
        const response = await fetch(`/api/user/favorite-communities?id=${slug}`, {
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
            name: subdivision.name,
            id: slug,
            type: 'subdivision',
            cityId: cityId,
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

  return (
    <div className={`min-h-screen py-12 px-4`} data-page="neighborhoods-subdivision">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4 drop-shadow-2xl`}>
              {subdivision.name}
            </h1>
            <p className={`text-xl ${textSecondary}`}>
              {subdivision.city}, {subdivision.region}
            </p>
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

        {/* Content */}
        <div className="space-y-8">
          {/* Photo Carousel */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
            <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6`}>
              Featured Listings
            </h2>
            <SubdivisionPhotoCarousel
              subdivisionSlug={slug}
              subdivisionName={subdivision.name}
              limit={20}
            />
          </div>

          {/* Stats with Toggle */}
          <SubdivisionStats
            subdivisionSlug={slug}
            initialStats={{
              listingCount: subdivision.listingCount,
              avgPrice: subdivision.avgPrice,
              medianPrice: subdivision.medianPrice,
              priceRange: subdivision.priceRange,
            }}
          />

          {/* Description */}
          {subdivision.description && (
            <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
              <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-4`}>
                About {subdivision.name}
              </h2>
              <p className={`${textSecondary} leading-relaxed`}>{subdivision.description}</p>

              {/* Features */}
              {subdivision.features && subdivision.features.length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-lg font-semibold ${textPrimary} mb-3`}>
                    Features & Amenities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {subdivision.features.map((feature: string, i: number) => (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isLight
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                        }`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Features */}
              {subdivision.communityFeatures && (
                <div className="mt-6">
                  <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                    Community Features
                  </h3>
                  <p className={`${textSecondary}`}>{subdivision.communityFeatures}</p>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          {subdivision.coordinates && (
            <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
              <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6`}>
                Location & Listings Map
              </h2>
              <SubdivisionMap
                subdivisionSlug={slug}
                subdivision={{
                  name: subdivision.name,
                  coordinates: subdivision.coordinates,
                }}
                height="500px"
              />
            </div>
          )}

          {/* Listings */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 md:p-8 ${shadow}`}>
            <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6`}>
              Available Homes
            </h2>
            <SubdivisionListings subdivisionSlug={slug} />
          </div>

          {/* Reviews Section */}
          <SubdivisionReviews
            subdivisionName={subdivision.name}
            subdivisionSlug={slug}
          />

          {/* Forum Section */}
          <SubdivisionForum
            subdivisionName={subdivision.name}
            subdivisionSlug={slug}
          />

          {/* Branded Buy/Sell CTA Section */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-4 text-center`}>
              Interested in {subdivision.name}?
            </h2>
            <p className={`text-lg ${textSecondary} mb-8 text-center max-w-3xl mx-auto`}>
              Whether you're looking to buy or sell in this exclusive community, Joey Sardella has the local expertise to guide you through every step of the process.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${cityId}/${slug}/buy`}
                className={`px-8 py-4 ${buttonPrimary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Buy in {subdivision.name}
              </Link>
              <Link
                href={`/neighborhoods/${cityId}/${slug}/sell`}
                className={`px-8 py-4 ${buttonSecondary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Sell Your Home Here
              </Link>
            </div>
            <p className={`text-sm ${textMuted} mt-6 text-center`}>
              Community specialist • Professional marketing • Expert negotiation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
