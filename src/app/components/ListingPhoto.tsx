// src/app/components/ListingPhoto.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Home } from "lucide-react";

interface ListingPhotoProps {
  listingKey: string;
  mlsId?: string;
  mlsSource?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Component to fetch and display listing photo from Spark API
 *
 * Fetches fresh photos from Spark Replication API instead of using
 * outdated primaryPhotoUrl from database.
 *
 * Props:
 * - listingKey: Required listing identifier
 * - mlsId: Optional MLS ID (if available, skips DB lookup)
 * - mlsSource: Optional MLS source (if available, skips DB lookup)
 * - alt: Alt text for image
 * - fill: Use Next.js Image fill mode
 * - width/height: Explicit dimensions
 * - className: Additional CSS classes
 * - priority: Load image eagerly (for above-fold images)
 */
export default function ListingPhoto({
  listingKey,
  mlsId,
  mlsSource,
  alt,
  fill = false,
  width,
  height,
  className = "",
  priority = false,
}: ListingPhotoProps) {
  const [photoUrl, setPhotoUrl] = useState<string>("/images/no-photo.png");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!listingKey) {
      console.warn('[ListingPhoto] No listingKey provided');
      setIsLoading(false);
      return;
    }

    const fetchPhoto = async () => {
      try {
        // Build URL with mlsId and mlsSource if available
        let url = `/api/listings/${listingKey}/photos`;
        if (mlsId && mlsSource) {
          url += `?mlsId=${encodeURIComponent(mlsId)}&mlsSource=${encodeURIComponent(mlsSource)}`;
        }

        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();

          if (data.photos && data.photos.length > 0) {
            const primaryPhoto = data.photos.find((p: any) => p.primary) || data.photos[0];
            const url = primaryPhoto.uri800 || primaryPhoto.uri640 || primaryPhoto.uri1024 || "/images/no-photo.png";
            setPhotoUrl(url);
          }
        }
      } catch (error) {
        console.error(`[ListingPhoto] Error fetching photo for ${listingKey}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();
  }, [listingKey, mlsId, mlsSource]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Fallback to placeholder icon if no photo
  if (photoUrl === "/images/no-photo.png") {
    return (
      <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
        <Home className="h-12 w-12 text-gray-500" />
      </div>
    );
  }

  // Render Next.js Image with proper props
  if (fill) {
    return (
      <Image
        src={photoUrl}
        alt={alt}
        fill
        priority={priority}
        className={className}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={photoUrl}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
      />
    );
  }

  // Fallback: use fill mode if no dimensions provided
  return (
    <Image
      src={photoUrl}
      alt={alt}
      fill
      priority={priority}
      className={className}
    />
  );
}
