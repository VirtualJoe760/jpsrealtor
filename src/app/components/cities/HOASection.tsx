"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (communities.length === 0) {
    return null; // Hide if no HOA data found
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Communities with HOA</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {communities.map((community) => (
          <Link
            key={community.slug}
            href={`/neighborhoods/${cityId}/${community.slug}`}
            className="group bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-4 hover:border-white/50 hover:shadow-2xl transition-all duration-200"
          >
            <h4 className="text-lg font-semibold text-white mb-2">{community.name}</h4>
            <div className="space-y-1 text-sm text-gray-400">
              <p>
                Avg HOA: <span className="font-semibold text-white">${community.avgHoaFee}/mo</span>
              </p>
              <p>
                <span className="font-semibold text-white">{community.listingCount}</span> listings
              </p>
            </div>
            <div className="mt-3 text-gray-300 text-sm font-medium group-hover:text-white group-hover:underline">
              View Listings →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
