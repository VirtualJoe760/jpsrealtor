"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface County {
  id: number;
  name: string;
  slug: string;
  listings: string;
  medianPrice: string;
  gradient: string;
  image: string;
}

const counties: County[] = [
  {
    id: 1,
    name: "Los Angeles",
    slug: "la",
    listings: "1,250+",
    medianPrice: "$1.2M",
    gradient: "from-purple-500 to-pink-500",
    image: "https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=600&q=80"
  },
  {
    id: 2,
    name: "Orange",
    slug: "oc",
    listings: "850+",
    medianPrice: "$1.1M",
    gradient: "from-orange-500 to-red-500",
    image: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=600&q=80"
  },
  {
    id: 3,
    name: "Riverside",
    slug: "riverside",
    listings: "1,100+",
    medianPrice: "$650K",
    gradient: "from-blue-500 to-cyan-500",
    image: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=600&q=80"
  },
  {
    id: 4,
    name: "San Bernardino",
    slug: "san-bern",
    listings: "920+",
    medianPrice: "$580K",
    gradient: "from-green-500 to-emerald-500",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
  },
  {
    id: 5,
    name: "San Diego",
    slug: "sd",
    listings: "1,400+",
    medianPrice: "$950K",
    gradient: "from-yellow-500 to-orange-500",
    image: "https://images.unsplash.com/photo-1578666073051-4937e03f8a50?w=600&q=80"
  },
  {
    id: 6,
    name: "Ventura",
    slug: "sb",
    listings: "420+",
    medianPrice: "$890K",
    gradient: "from-indigo-500 to-purple-500",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"
  },
  {
    id: 7,
    name: "Imperial",
    slug: "imperial",
    listings: "280+",
    medianPrice: "$420K",
    gradient: "from-red-500 to-pink-500",
    image: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&q=80"
  },
  {
    id: 8,
    name: "Coachella Valley",
    slug: "coachella",
    listings: "650+",
    medianPrice: "$720K",
    gradient: "from-teal-500 to-blue-500",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80"
  },
];

export default function CountyGrid() {
  const router = useRouter();
  const { textPrimary, textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const handleCountyClick = (slug: string) => {
    router.push(`/neighborhoods/${slug}`);
  };

  return (
    <div className={`min-h-screen py-20 px-4 overflow-y-auto ${isLight ? 'bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
      <div className="max-w-6xl mx-auto pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4`}>
            Southern California
          </h1>
          <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
            Tap a region to explore cities and properties
          </p>
        </motion.div>

        {/* County Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {counties.map((county, index) => (
            <motion.button
              key={county.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCountyClick(county.slug)}
              className={`relative overflow-hidden rounded-2xl text-left transition-all duration-300 group ${
                isLight
                  ? 'bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-2xl'
                  : 'bg-gray-800/60 backdrop-blur-sm border border-gray-700 shadow-xl hover:shadow-2xl'
              }`}
              style={{
                backdropFilter: 'blur(10px) saturate(150%)',
                WebkitBackdropFilter: 'blur(10px) saturate(150%)',
              }}
            >
              {/* Thumbnail Image */}
              <div className="relative w-full h-48 overflow-hidden">
                <Image
                  src={county.image}
                  alt={county.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${county.gradient} opacity-20 mix-blend-overlay`} />
                <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-t from-white/60 via-transparent to-transparent' : 'bg-gradient-to-t from-gray-900/80 via-transparent to-transparent'}`} />
              </div>

              {/* Content */}
              <div className="p-6">
                {/* County Name */}
                <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>
                  {county.name}
                </h3>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${textSecondary}`}>Active Listings</span>
                    <span className={`font-semibold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                      {county.listings}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${textSecondary}`}>Median Price</span>
                    <span className={`font-semibold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                      {county.medianPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Arrow Indicator */}
              <div className={`absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isLight
                  ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  : 'bg-blue-900/50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
              }`}>
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className={`mt-16 text-center p-8 rounded-2xl ${
            isLight
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
              : 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50'
          }`}
        >
          <h3 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            Can't Find What You're Looking For?
          </h3>
          <p className={`${textSecondary} mb-6`}>
            Let me help you discover your perfect property in Southern California
          </p>
          <button
            onClick={() => router.push('/contact')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-xl hover:shadow-2xl'
            }`}
          >
            Contact Joey Sardella
          </button>
        </motion.div>
      </div>
    </div>
  );
}
