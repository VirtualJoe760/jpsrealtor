"use client";

import React from "react";
import Link from "next/link";
import { County } from "@/app/constants/counties";
import { motion } from "framer-motion";
import { MapPin, Users, Building2 } from "lucide-react";

interface CountyCityGridProps {
  county: County;
}

export default function CountyCityGrid({ county }: CountyCityGridProps) {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Southern California</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
            {county.name}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
            {county.description}
          </p>
        </motion.div>

        {/* Cities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Explore Cities in {county.name}
            </h2>
          </div>
          <p className="text-gray-300 mb-8">
            Click on any city to view homes, neighborhoods, and community information.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {county.cities.map((city, index) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Link
                  href={`/neighborhoods/${city.id}`}
                  className="group block bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 hover:bg-gray-800/70 hover:shadow-2xl transition-all duration-200"
                >
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    {city.name}
                  </h3>
                  {city.population && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span>Population: {city.population.toLocaleString()}</span>
                    </div>
                  )}
                  {city.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                      {city.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-gray-300 text-sm font-medium group-hover:text-blue-400 transition-colors">
                    <MapPin className="w-4 h-4" />
                    <span>View Properties</span>
                    <span className="ml-auto">→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back to Counties */}
        <div className="text-center">
          <Link
            href="/neighborhoods"
            className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white px-6 py-3 rounded-lg hover:border-gray-600 hover:bg-gray-800/70 shadow-lg hover:shadow-2xl transition-all duration-200"
          >
            <span>←</span>
            <span>Back to All Counties</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
