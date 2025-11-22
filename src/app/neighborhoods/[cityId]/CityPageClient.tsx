"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import CityMap from "@/app/components/cities/CityMap";
import CityStats from "@/app/components/cities/CityStats";
import SubdivisionsSection from "@/app/components/cities/SubdivisionsSection";
import HOASection from "@/app/components/cities/HOASection";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

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

  // Theme support - Use centralized theme classes
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    buttonPrimary,
    buttonSecondary,
    shadow,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

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

  return (
    <div className="min-h-screen py-12 px-4" data-page="neighborhoods-city">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <p className={`text-sm ${textMuted} mb-2 flex items-center gap-2`}>
            <span>{countyName}</span>
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4 drop-shadow-2xl`}>
                {city.name}
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

          {/* Dynamic Community Data Sections */}
          <SubdivisionsSection cityId={cityId} />
          <HOASection cityId={cityId} />

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
