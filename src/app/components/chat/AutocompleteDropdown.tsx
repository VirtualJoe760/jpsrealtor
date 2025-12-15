"use client";

import { RefObject } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { getSuggestionDisplay } from "./utils/getSuggestionDisplay";
import type { AutocompleteSuggestion } from "./hooks/useAutocomplete";

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  showSuggestions: boolean;
  selectedIndex: number;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  suggestionsRef: RefObject<HTMLDivElement>;
  variant?: "landing" | "conversation" | "map";
}

export default function AutocompleteDropdown({
  suggestions,
  showSuggestions,
  selectedIndex,
  onSelect,
  suggestionsRef,
  variant = "conversation",
}: AutocompleteDropdownProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  // Determine positioning class based on variant
  // For map variant, use fixed positioning to match ChatInput
  // For conversation variant, use absolute positioning relative to parent
  const positionClass = variant === "conversation"
    ? "absolute bottom-full mb-2 w-full"
    : variant === "map"
      ? "fixed left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl"
      : "absolute top-full mt-2 w-full";

  // Calculate bottom offset for map variant (above the input)
  const bottomOffset = variant === "map"
    ? "calc(92px + 4rem + 0.5rem)" // bottom-[92px] + input height (~4rem) + gap (0.5rem)
    : undefined;

  return (
    <div
      ref={suggestionsRef}
      className={`${positionClass} rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-40 max-h-80 overflow-y-auto ${
        isLight ? "bg-white/95 border border-gray-300" : "bg-neutral-800/95 border border-neutral-700"
      }`}
      style={{
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
        ...(variant === "map" && bottomOffset ? { bottom: bottomOffset } : {}),
        pointerEvents: 'auto',
      }}
    >
      {suggestions.map((suggestion, index) => {
        const display = getSuggestionDisplay(suggestion, isLight);

        return (
          <div
            key={index}
            onClick={() => onSelect(suggestion)}
            className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
              index === selectedIndex
                ? isLight
                  ? "bg-blue-100"
                  : "bg-emerald-600/30"
                : isLight
                  ? "hover:bg-gray-100"
                  : "hover:bg-neutral-700"
            } ${index !== 0 ? (isLight ? "border-t border-gray-200" : "border-t border-neutral-700") : ""}`}
          >
            {/* Icon or Photo */}
            {suggestion.photo ? (
              <img
                src={suggestion.photo}
                alt={suggestion.label}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              display.icon
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Main label */}
              <div className={`font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                {display.isAskAI && (
                  <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                    Ask AI:{" "}
                  </span>
                )}
                {suggestion.label}
              </div>

              {/* Subtitle with type indicator */}
              {!display.isAskAI && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {suggestion.type === "listing" ? (
                    <>
                      <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                        Map Query
                      </span>
                      {suggestion.mlsSource && (
                        <>
                          <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                          <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                            {suggestion.mlsSource}
                          </span>
                        </>
                      )}
                      {display.subtitle && (
                        <>
                          <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                          <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                            {display.subtitle}
                          </span>
                        </>
                      )}
                    </>
                  ) : suggestion.type === "city" || suggestion.type === "subdivision" ||
                     suggestion.type === "county" || suggestion.type === "region" ||
                     suggestion.type === "geocode" ? (
                    <>
                      <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                        Map Query
                      </span>
                      <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                      <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                        {display.subtitle}
                      </span>
                    </>
                  ) : (
                    <span className={isLight ? "text-gray-500" : "text-neutral-400"}>
                      {display.subtitle}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
