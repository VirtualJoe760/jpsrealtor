import React from 'react';
import { MapListing } from '@/types/types';

interface AsidePreviewProps {
  listings: MapListing[];
}

export default function AsidePreview({ listings }: AsidePreviewProps) {
  return (
    <div className="space-y-4">
      {listings.length === 0 ? (
        <p className="text-sm text-zinc-400">Zoom in to see listings in this area.</p>
      ) : (
        listings.map((listing) => (
          <div
            key={listing._id}
            className="bg-zinc-800 rounded-lg overflow-hidden shadow-sm border border-zinc-700 hover:border-emerald-400 transition"
          >
            <img
              src={listing.primaryPhotoUrl || '/placeholder.jpg'}
              alt={listing.address}
              className="w-full h-32 object-cover"
            />
            <div className="p-3">
              <div className="font-semibold text-emerald-400 text-sm mb-1">
                {listing.unparsedFirstLineAddress}
              </div>
              <div className="text-white text-xs">
                <span className="font-medium">{formatPrice(listing.listPrice)}</span>
                <span className="ml-2">
                  {listing.bedroomsTotal ? `🛏 ${listing.bedroomsTotal}` : ''}
                  {listing.bathroomsFull ? ` • 🛁 ${listing.bathroomsFull}` : ''}
                </span>
                {listing.livingArea && (
                  <div className="text-zinc-400 mt-1 text-[11px]">
                    📀 {listing.livingArea.toLocaleString()} SqFt
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatPrice(price?: number): string {
  if (!price) return '—';
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}
