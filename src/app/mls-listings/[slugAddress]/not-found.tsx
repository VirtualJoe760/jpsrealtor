"use client";

import Link from "next/link";
import { Home, Search, MapPin, Phone, ArrowRight } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function ListingNotFound() {
  const { currentTheme, cardBg, cardBorder, textPrimary, textSecondary, shadow } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
              isLight ? "bg-amber-50" : "bg-amber-500/10"
            }`}
          >
            <Home className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-3`}>
            This Listing Is No Longer Available
          </h1>
          <p className={`${textSecondary} text-base md:text-lg max-w-xl mx-auto`}>
            This property may have been sold, taken off the market, or the listing
            has expired. Don&apos;t worry — there are plenty of great homes available
            in the Coachella Valley.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/mls-listings"
            className={`${cardBg} ${cardBorder} border rounded-xl p-5 ${shadow} block hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-blue-50" : "bg-blue-500/10"}`}>
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <span className={`text-lg font-semibold ${textPrimary}`}>Search Listings</span>
            </div>
            <p className={`text-sm ${textSecondary}`}>
              Browse active listings on our interactive map
            </p>
          </Link>

          <Link
            href="/neighborhoods"
            className={`${cardBg} ${cardBorder} border rounded-xl p-5 ${shadow} block hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-emerald-50" : "bg-emerald-500/10"}`}>
                <MapPin className="w-5 h-5 text-emerald-500" />
              </div>
              <span className={`text-lg font-semibold ${textPrimary}`}>Explore Neighborhoods</span>
            </div>
            <p className={`text-sm ${textSecondary}`}>
              Find communities in Palm Desert, Indian Wells, La Quinta & more
            </p>
          </Link>
        </div>

        {/* Contact CTA */}
        <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow}`}>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>
            Looking for Something Similar?
          </h2>
          <p className={`${textSecondary} mb-4`}>
            I can help you find comparable properties in the same area. As a local
            Coachella Valley expert, I know the market inside and out.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:+17603333676"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <Phone className="w-4 h-4" />
              Call (760) 333-3676
            </a>
            <Link
              href="/book-appointment"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200"
              }`}
            >
              Book Appointment
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
