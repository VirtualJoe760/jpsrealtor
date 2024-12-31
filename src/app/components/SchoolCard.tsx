"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface SchoolCardProps {
  id: string;
  name: string;
  address: string;
  rating?: number;
  photoReference?: string | null;
}

const SchoolCard: React.FC<SchoolCardProps> = ({
  id,
  name,
  address,
  rating,
  photoReference,
}) => {
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoReference) {
      fetch(`/api/schoolImage?photo_reference=${photoReference}`)
        .then((res) => {
          console.log("Image Fetch Response:", res);
          if (!res.ok) {
            throw new Error(`Failed to fetch image: ${res.status}`);
          }
          return res.blob();
        })
        .then((blob) => {
          setResolvedImageUrl(URL.createObjectURL(blob));
        })
        .catch((error) => {
          setResolvedImageUrl(null);
          console.error("Error resolving image URL:", error);
        });
    }
  }, [photoReference]);
  
  

  return (
    <>
      <div className="flex rounded-lg overflow-hidden shadow-lg">
        {/* Photo Section */}
        <div className="w-1/3 flex items-center justify-center bg-gray-200">
          {resolvedImageUrl ? (
            <img
              src={resolvedImageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-700 text-sm">No Image Available</span>
          )}
        </div>

        {/* Details Section */}
        <div className="flex-1 p-6 bg-gray-800">
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <p className="text-white">
            <strong>Address:</strong> {address}
          </p>
          {rating && (
            <p className="text-white">
              <strong>Rating:</strong> {rating} / 5
            </p>
          )}
          <Link
            href={`/schools/${id}`}
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            View More Details
          </Link>
        </div>
      </div>
      <hr />
    </>
  );
};

export default SchoolCard;
