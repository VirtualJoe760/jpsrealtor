"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { IUnifiedListing } from "@/models/unified-listing";

// Map property type codes to human-readable names
export function getPropertyTypeLabel(code?: string): string {
  if (!code) return "";

  const mapping: Record<string, string> = {
    'A': 'Residential',
    'B': 'Residential Lease',
    'C': 'Residential Income',
    'D': 'Land',
    'E': 'Manufactured In Park',
    'F': 'Commercial Sale',
    'G': 'Commercial Lease',
    'H': 'Business Opportunity',
    'I': 'Vacation Rental',
  };

  return mapping[code.toUpperCase()] || code;
}

export default function ListingPropertyDetails({ listing, subdivisionUrl, isLight, variants }: {
  listing: IUnifiedListing;
  subdivisionUrl?: string | null;
  isLight: boolean;
  variants?: Variants;
}) {
  return (
    <>
    {/* Features Panel */}
    <motion.div
      variants={variants}
      className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
        isLight
          ? 'bg-white/80 border-2 border-gray-300'
          : 'bg-black/40 border border-neutral-800/50'
      }`}
      style={isLight ? {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      } : undefined}
    >
      <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}>
        <div className={`w-1 h-6 rounded-full ${
          isLight
            ? 'bg-gradient-to-b from-purple-500 to-pink-500'
            : 'bg-gradient-to-b from-purple-400 to-pink-400'
        }`} />
        Features & Amenities
      </h2>

      <div className="flex flex-wrap gap-2">
        {listing.subdivisionName && listing.subdivisionName.toLowerCase() !== "other" && (
          subdivisionUrl ? (
            <Link
              href={subdivisionUrl}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isLight
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50'
              }`}
            >
              {listing.subdivisionName}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              isLight
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {listing.subdivisionName}
            </span>
          )
        )}
        {listing.landType && (
          <span className={`px-4 py-2 rounded-full text-sm ${
            isLight
              ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
              : 'bg-neutral-800/70 text-white border border-neutral-700/30'
          }`}>
            {listing.landType}
          </span>
        )}
        {listing.terms && listing.terms.length > 0 && (
          <span className={`px-4 py-2 rounded-full text-sm ${
            isLight
              ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
              : 'bg-neutral-800/70 text-white border border-neutral-700/30'
          }`}>
            {listing.terms.join(", ")}
          </span>
        )}
        {listing.yearBuilt && (
          <span className={`px-4 py-2 rounded-full text-sm ${
            isLight
              ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
              : 'bg-neutral-800/70 text-white border border-neutral-700/30'
          }`}>
            Built {listing.yearBuilt}
          </span>
        )}
        {listing.poolYn && (
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            isLight
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            🏊 Pool
          </span>
        )}
        {listing.spaYn && (
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            isLight
              ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          }`}>
            🧖 Spa
          </span>
        )}
      </div>
    </motion.div>

    {/* Property Details Panel */}
    <motion.div
      variants={variants}
      className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
        isLight
          ? 'bg-white/80 border-2 border-gray-300'
          : 'bg-black/40 border border-neutral-800/50'
      }`}
      style={isLight ? {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      } : undefined}
    >
      <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}>
        <div className={`w-1 h-6 rounded-full ${
          isLight
            ? 'bg-gradient-to-b from-cyan-500 to-blue-500'
            : 'bg-gradient-to-b from-cyan-400 to-blue-400'
        }`} />
        Property Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listing.subdivisionName && (
          <div className={`rounded-xl p-4 ${
            isLight
              ? 'bg-gray-50 border-2 border-gray-200'
              : 'bg-neutral-900/30 border border-neutral-700/20'
          }`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Subdivision</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.subdivisionName}</div>
          </div>
        )}
        {listing.landType && (
          <div className={`rounded-xl p-4 ${
            isLight
              ? 'bg-gray-50 border-2 border-gray-200'
              : 'bg-neutral-900/30 border border-neutral-700/20'
          }`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Land Type</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.landType}</div>
          </div>
        )}
        {listing.yearBuilt && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Year Built</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.yearBuilt}</div>
          </div>
        )}
        {listing.propertyType && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Property Type</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{getPropertyTypeLabel(listing.propertyType)}</div>
          </div>
        )}
        {listing.propertySubType && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Property Subtype</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.propertySubType}</div>
          </div>
        )}
        {listing.stories !== undefined && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Stories</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.stories}</div>
          </div>
        )}
        {listing.parkingTotal !== undefined && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Parking Spaces</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.parkingTotal}</div>
          </div>
        )}
        {listing.garageSpaces !== undefined && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Garage Spaces</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.garageSpaces}</div>
          </div>
        )}
        {listing.heating && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Heating</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.heating}</div>
          </div>
        )}
        {listing.cooling && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Cooling</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.cooling}</div>
          </div>
        )}
        {listing.view && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>View</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.view}</div>
          </div>
        )}
        {listing.flooring && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Flooring</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.flooring}</div>
          </div>
        )}
        {listing.roof && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Roof</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.roof}</div>
          </div>
        )}
        {listing.city && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>City</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.city}</div>
          </div>
        )}
        {listing.postalCode && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Zip Code</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.postalCode}</div>
          </div>
        )}
        {listing.countyOrParish && (
          <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>County</div>
            <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.countyOrParish}</div>
          </div>
        )}
      </div>
    </motion.div>
    </>
  );
}
