"use client";

import React, { useState, useEffect } from "react";
import OhCaptureHero from "@/components/OhCaptureHero";
import { scrapeMLS } from "@/scripts/scrapeMLS";

const OpenHousePage: React.FC = () => {
  const [mlsUrl, setMlsUrl] = useState("");
  const [listingData, setListingData] = useState<any>(null);
  const [recentListings, setRecentListings] = useState<any[]>([]);

  useEffect(() => {
    // Load recent open houses from localStorage
    const storedListings = JSON.parse(localStorage.getItem("recentOpenHouses") || "[]");
    setRecentListings(storedListings);
  }, []);

  const handleFetchListing = async () => {
    if (!mlsUrl) return;

    const data = await scrapeMLS(mlsUrl);
    if (data) {
      setListingData(data);
      
      // Update localStorage with the new listing
      const updatedListings = [data, ...recentListings.slice(0, 5)];
      localStorage.setItem("recentOpenHouses", JSON.stringify(updatedListings));
      setRecentListings(updatedListings);
    }
  };

  const handleSelectRecent = (listing: any) => {
    setListingData(listing);
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-2xl mx-auto  p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Enter MLS Listing URL</h2>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4"
          placeholder="Paste MLS link here..."
          value={mlsUrl}
          onChange={(e) => setMlsUrl(e.target.value)}
        />
        <button
          onClick={handleFetchListing}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Fetch Listing
        </button>
      </div>
      
      {recentListings.length > 0 && (
        <div className="max-w-2xl mx-auto p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4">Recent Open Houses</h2>
          <div className="grid grid-cols-2 gap-4">
            {recentListings.map((listing, index) => (
              <div
                key={index}
                className="cursor-pointer p-4 border rounded-lg hover:bg-gray-200"
                onClick={() => handleSelectRecent(listing)}
              >
                <p className="font-medium">{listing.address}</p>
                <p className="text-sm">{listing.beds} Bed | {listing.baths} Bath | {listing.sqft} sqft</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {listingData && (
        <div className="mt-6">
          <OhCaptureHero
            address={listingData.address}
            beds={listingData.beds}
            baths={listingData.baths}
            sqft={listingData.sqft}
            lotSize={listingData.lotSize}
            images={listingData.images}
            qrLink={mlsUrl}
          />
        </div>
      )}
    </div>
  );
};

export default OpenHousePage;