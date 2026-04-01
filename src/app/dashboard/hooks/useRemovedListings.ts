// src/app/dashboard/hooks/useRemovedListings.ts
"use client";

import { useMemo, useState, useEffect } from "react";
import { FavoriteProperty, RemovedListing, RemovedListingsResult } from "../utils/types";

const MODAL_DISMISSED_KEY = "dashboard-removed-listings-dismissed";

export function useRemovedListings(favorites: FavoriteProperty[]) {
  const [modalDismissed, setModalDismissed] = useState(false);

  // Check if user dismissed modal in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem(MODAL_DISMISSED_KEY);
    setModalDismissed(dismissed === "true");
  }, []);

  const removedListingsResult = useMemo((): RemovedListingsResult => {
    const removedListings: RemovedListing[] = [];
    const seen = new Set<string>();

    favorites.forEach((listing) => {
      // Skip duplicates
      if (seen.has(listing.listingKey)) {
        return;
      }
      seen.add(listing.listingKey);

      // Check for removed listings using the _missing flag from the API
      // This flag is set when the listing is not found in UnifiedListing (removed from market)
      const isRemoved = (listing as any)._missing === true;

      if (isRemoved) {
        removedListings.push({
          listingKey: listing.listingKey,
          listing,
        });
      }
    });

    return {
      hasRemovedListings: removedListings.length > 0,
      removedListings,
      count: removedListings.length,
    };
  }, [favorites]);

  const shouldShowModal = removedListingsResult.hasRemovedListings && !modalDismissed;

  const dismissModal = () => {
    sessionStorage.setItem(MODAL_DISMISSED_KEY, "true");
    setModalDismissed(true);
  };

  return {
    removedListingsResult,
    shouldShowModal,
    dismissModal,
  };
}
