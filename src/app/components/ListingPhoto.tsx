// src/app/components/ListingPhoto.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Home } from "lucide-react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const refreshAttemptedRef = useRef(false); // Prevent infinite refresh loops

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

        console.log(`[ListingPhoto] Fetching: ${url.substring(0, 100)}`);

        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();

          console.log(`[ListingPhoto] ${listingKey}: ${data.photos?.length || 0} photos found`);

          // Check if we found photos
          const hasPhotos = data.photos && data.photos.length > 0;

          // STALE DATA DETECTION: Check if mlsId changed OR no photos found
          const shouldRefresh = session && !refreshAttemptedRef.current && (
            // Case 1: mlsId changed (property was relisted)
            (mlsId && data.mlsId && mlsId !== data.mlsId) ||
            // Case 2: No photos found but we have mlsId (photo fetch failed)
            (!hasPhotos && mlsId)
          );

          if (shouldRefresh) {
            if (mlsId && data.mlsId && mlsId !== data.mlsId) {
              console.warn(`[ListingPhoto] ⚠️ STALE DATA DETECTED for ${listingKey}:`);
              console.warn(`   Cached mlsId: ${mlsId}`);
              console.warn(`   Fresh mlsId:  ${data.mlsId}`);
            } else if (!hasPhotos) {
              console.warn(`[ListingPhoto] ⚠️ NO PHOTOS FOUND for ${listingKey}`);
              console.warn(`   This may indicate stale or missing listing data`);
            }

            // Refresh endpoint does not exist — skip
            refreshAttemptedRef.current = true;
          }

          if (hasPhotos) {
            const primaryPhoto = data.photos.find((p: any) => p.primary) || data.photos[0];
            const url = primaryPhoto.uri800 || primaryPhoto.uri640 || primaryPhoto.uri1024 || "/images/no-photo.png";
            setPhotoUrl(url);
          } else {
            console.warn(`[ListingPhoto] ${listingKey}: No photos in response`);
          }
        } else {
          console.warn(`[ListingPhoto] ${listingKey}: API returned ${res.status}`);
        }
      } catch (error) {
        console.error(`[ListingPhoto] Error fetching photo for ${listingKey}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();
  }, [listingKey, mlsId, mlsSource, session]);

  if (isLoading) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${className}`} style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading photo...</span>
        </div>
      </div>
    );
  }

  // Fallback to placeholder if no photo
  if (photoUrl === "/images/no-photo.png") {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 ${className}`} style={{ minHeight: fill ? undefined : '280px' }}>
        <div className="relative mb-4">
          <Home className="h-32 w-32 text-slate-400 opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
        </div>
        <p className="text-base text-slate-300 font-semibold">No Photo Available</p>
        <p className="text-sm text-slate-500 mt-2 text-center px-4">Refreshing listing data...</p>
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
