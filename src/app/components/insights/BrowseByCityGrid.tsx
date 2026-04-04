"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const cities = [
  { name: "Palm Springs", slug: "palm-springs", listings: "6,600+", tagline: "Mid-Century Modern Capital" },
  { name: "Palm Desert", slug: "palm-desert", listings: "4,400+", tagline: "El Paseo & Luxury Living" },
  { name: "Indio", slug: "indio", listings: "3,600+", tagline: "Festival City & Affordable Finds" },
  { name: "La Quinta", slug: "la-quinta", listings: "2,900+", tagline: "Gem of the Desert" },
  { name: "Desert Hot Springs", slug: "desert-hot-springs", listings: "2,400+", tagline: "Hot Mineral Springs" },
  { name: "Cathedral City", slug: "cathedral-city", listings: "1,900+", tagline: "Heart of the Valley" },
  { name: "Rancho Mirage", slug: "rancho-mirage", listings: "1,600+", tagline: "Playground of Presidents" },
  { name: "Indian Wells", slug: "indian-wells", listings: "880+", tagline: "Tennis & Luxury Estates" },
  { name: "Coachella", slug: "coachella", listings: "500+", tagline: "Eastside Growth Hub" },
];

export default function BrowseByCityGrid() {
  const { currentTheme, cardBg, cardBorder, textPrimary, textSecondary, shadow } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
          Browse Homes by City
        </h2>
        <Link
          href="/neighborhoods"
          className={`text-sm font-medium flex items-center gap-1 transition-colors ${
            isLight ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
          }`}
        >
          All Cities
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/neighborhoods/${city.slug}`}
            className={`group ${cardBg} ${cardBorder} border rounded-xl p-4 ${shadow} block hover:scale-[1.01] transition-all duration-200`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isLight ? "bg-blue-50" : "bg-blue-500/10"
              }`}>
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${textPrimary} group-hover:text-blue-500 transition-colors`}>
                  {city.name}
                </h3>
                <p className={`text-xs ${textSecondary} truncate`}>
                  {city.tagline}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
