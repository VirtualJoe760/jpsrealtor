"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface HOACommunity {
  name: string;
  slug: string;
  avgHoaFee: number;
  listingCount: number;
}

interface HOASectionProps {
  cityId: string;
}

export default function HOASection({ cityId }: HOASectionProps) {
  const [communities, setCommunities] = useState<HOACommunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme support
  const { cardBg, cardBorder, textPrimary, textSecondary, shadow, bgTertiary } = useThemeClasses();

  useEffect(() => {
    async function fetchHOAData() {
      try {
        const res = await fetch(`/api/cities/${cityId}/hoa`);
        if (res.ok) {
          const data = await res.json();
          setCommunities(data.communities || []);
        }
      } catch (error) {
        console.error("Error fetching HOA data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHOAData();
  }, [cityId]);

  if (loading) {
    return (
      <div className={`${cardBg} ${cardBorder} border rounded-lg p-6 animate-pulse`}>
        <div className={`h-6 ${bgTertiary} rounded w-1/3 mb-4`}></div>
        <div className={`h-4 ${bgTertiary} rounded w-2/3`}></div>
      </div>
    );
  }

  if (communities.length === 0) {
    return null; // Hide if no HOA data found
  }

  return (
    <div className="mb-8">
      <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Communities with HOA</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {communities.map((community) => (
          <Link
            key={community.slug}
            href={`/neighborhoods/${cityId}/${community.slug}`}
            className={`group ${cardBg} ${cardBorder} border rounded-lg p-4 ${shadow} hover:shadow-2xl transition-all duration-200`}
          >
            <h4 className={`text-lg font-semibold ${textPrimary} mb-2`}>{community.name}</h4>
            <div className={`space-y-1 text-sm ${textSecondary}`}>
              <p>
                Avg HOA: <span className={`font-semibold ${textPrimary}`}>${community.avgHoaFee}/mo</span>
              </p>
              <p>
                <span className={`font-semibold ${textPrimary}`}>{community.listingCount}</span> listings
              </p>
            </div>
            <div className={`mt-3 ${textSecondary} text-sm font-medium group-hover:${textPrimary} group-hover:underline`}>
              View Listings →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
