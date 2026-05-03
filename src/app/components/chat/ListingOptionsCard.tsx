"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { Bed, Bath, Square, MapPin, Home } from "lucide-react";

interface ListingOption {
  listingKey: string;
  slugAddress: string;
  address: string;
  city?: string;
  subdivision?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  primaryPhotoUrl?: string;
}

interface ListingOptionsCardProps {
  options: ListingOption[];
}

export default function ListingOptionsCard({ options }: ListingOptionsCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const handleSelect = (option: ListingOption) => {
    const chatInput = document.querySelector('[data-chat-input]') as HTMLInputElement;
    if (chatInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(chatInput, `Tell me about ${option.address}`);
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      // Auto-submit by simulating Enter
      setTimeout(() => {
        const form = chatInput.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }, 50);
    }
  };

  const formatPrice = (p: number) => {
    if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2)}M`;
    return `$${p.toLocaleString()}`;
  };

  return (
    <div className="space-y-2 px-2 xl:px-8 2xl:px-16">
      {options.map((option) => (
        <button
          key={option.listingKey}
          onClick={() => handleSelect(option)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
            isLight
              ? "bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow"
              : "bg-neutral-800/70 hover:bg-neutral-700/70 border border-neutral-700 hover:border-emerald-600/50"
          }`}
        >
          {/* Photo thumbnail */}
          <div className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 ${
            isLight ? "bg-gray-100" : "bg-neutral-700"
          }`}>
            {option.primaryPhotoUrl ? (
              <img
                src={option.primaryPhotoUrl}
                alt={option.address}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className={`w-6 h-6 ${isLight ? "text-gray-300" : "text-neutral-500"}`} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-semibold truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                {option.address}
              </p>
              {option.price && (
                <span className={`text-sm font-bold whitespace-nowrap ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                  {formatPrice(option.price)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              {option.beds != null && (
                <span className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  <Bed className="w-3 h-3" /> {option.beds}
                </span>
              )}
              {option.baths != null && (
                <span className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  <Bath className="w-3 h-3" /> {option.baths}
                </span>
              )}
              {option.sqft != null && option.sqft > 0 && (
                <span className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  <Square className="w-3 h-3" /> {option.sqft.toLocaleString()}
                </span>
              )}
              {option.subdivision && (
                <span className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
                  <MapPin className="w-3 h-3" /> {option.subdivision}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className={`flex-shrink-0 ${isLight ? "text-gray-300" : "text-neutral-600"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
