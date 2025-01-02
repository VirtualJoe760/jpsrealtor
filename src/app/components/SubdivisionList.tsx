// src/components/SubdivisionList.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ClipLoader from "react-spinners/ClipLoader"; // Import the spinner

interface Subdivision {
  name: string;
  description: string;
  photo: string;
  slug: string;
}

interface SubdivisionListProps {
  subdivisions: Subdivision[];
  cityId: string;
}

export default function SubdivisionList({
  subdivisions,
  cityId,
}: SubdivisionListProps) {
  const [validSubdivisions, setValidSubdivisions] = useState<Subdivision[]>([]);
  const [loading, setLoading] = useState(true); // Track loading state

  useEffect(() => {
    // Simulate loading time for demonstration (optional)
    const timeout = setTimeout(() => {
      const valid = subdivisions.filter((subdivision) => subdivision.photo);
      setValidSubdivisions(valid);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [subdivisions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader color="#ffffff" size={50} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {validSubdivisions.length > 0 ? (
        validSubdivisions.map((subdivision) => (
          <div
            key={subdivision.name}
            id={`subdivision-${subdivision.name}`}
            className="flex flex-col rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <Image
              src={subdivision.photo}
              alt={subdivision.name}
              width={600}
              height={400}
              className="w-full h-64 object-cover"
              onError={() => {
                setValidSubdivisions((current) =>
                  current.filter((s) => s.name !== subdivision.name)
                );
              }}
            />
            <div className="p-6">
              <Link
                href={`/neighborhoods/${cityId}/subdivisions/${subdivision.slug}`}
              >
                <h2 className="text-2xl font-bold text-white mb-4 hover:underline">
                  {subdivision.name}
                </h2>
              </Link>
              <p className="text-lg text-gray-300 mb-4">
                {subdivision.description.length > 100
                  ? `${subdivision.description.slice(0, 100)}...`
                  : subdivision.description}
              </p>
              <Link
                href={`/neighborhoods/${cityId}/subdivisions/${subdivision.slug}`}
                className="text-sm font-medium text-blue-500 hover:underline"
              >
                Learn more →
              </Link>
            </div>
          </div>
        ))
      ) : (
        <p className="text-lg text-gray-400">No subdivisions found.</p>
      )}
    </div>
  );
}
