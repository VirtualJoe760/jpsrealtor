// src/app/dashboard/components/FavoriteCommunities.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Heart, Home, Building2 } from "lucide-react";
import { FavoriteCommunity } from "../utils/types";

interface FavoriteCommunitiesProps {
  favoriteCommunities: FavoriteCommunity[];
  isLoadingCommunities: boolean;
  removeCommunity: (id: string) => void;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  shadow: string;
  isLight: boolean;
}

export default function FavoriteCommunities({
  favoriteCommunities,
  isLoadingCommunities,
  removeCommunity,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  textTertiary,
  shadow,
  isLight,
}: FavoriteCommunitiesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65 }}
      className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${textPrimary} flex items-center`}>
          <MapPin className="w-6 h-6 mr-2 text-blue-400" />
          Your Favorite Communities
        </h2>
      </div>

      {isLoadingCommunities ? (
        <div className={`text-center py-12 ${textSecondary}`}>Loading communities...</div>
      ) : favoriteCommunities.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className={`w-16 h-16 mx-auto mb-4 ${textTertiary}`} />
          <p className={`${textSecondary} mb-4`}>No favorite communities yet</p>
          <Link
            href="/neighborhoods"
            className={`inline-block px-6 py-3 rounded-lg transition-all text-white font-medium ${
              isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Explore Neighborhoods
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteCommunities.map((community) => {
            const isCity = community.type === "city";
            const href = isCity
              ? `/neighborhoods/${community.id}`
              : `/neighborhoods/${community.cityId}/${community.id}`;

            return (
              <motion.div
                key={`${community.type}-${community.id}`}
                whileHover={{ scale: 1.02 }}
                className={`${cardBg} border rounded-xl p-5 transition-all group relative ${
                  isLight
                    ? "border-gray-300 hover:border-blue-400"
                    : "border-gray-700 hover:border-emerald-500"
                }`}
              >
                {/* Remove Button */}
                <button
                  onClick={() => removeCommunity(community.id)}
                  className={`absolute top-3 right-3 rounded-full p-2 transition-colors ${
                    isLight ? "bg-white/70 hover:bg-white/90" : "bg-black/50 hover:bg-black/70"
                  }`}
                  title="Remove from favorites"
                >
                  <Heart className="h-5 w-5 fill-red-400 text-red-400" />
                </button>

                {/* Community Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    isCity
                      ? isLight
                        ? "bg-blue-50"
                        : "bg-blue-500/10"
                      : isLight
                        ? "bg-green-50"
                        : "bg-green-500/10"
                  }`}
                >
                  {isCity ? (
                    <Home className={`w-6 h-6 ${isCity ? "text-blue-400" : "text-green-400"}`} />
                  ) : (
                    <Building2 className="w-6 h-6 text-green-400" />
                  )}
                </div>

                {/* Community Name */}
                <h3 className={`text-lg font-bold ${textPrimary} mb-1 pr-8`}>
                  {community.name}
                </h3>

                {/* Community Type Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      isCity
                        ? isLight
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-900/40 text-blue-300"
                        : isLight
                          ? "bg-green-100 text-green-700"
                          : "bg-green-900/40 text-green-300"
                    }`}
                  >
                    {isCity ? "City" : "Subdivision"}
                  </span>
                </div>

                {/* View Button */}
                <Link
                  href={href}
                  className={`block w-full text-center py-2 text-white font-medium rounded-lg transition-colors text-sm ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  View {isCity ? "City" : "Subdivision"}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
