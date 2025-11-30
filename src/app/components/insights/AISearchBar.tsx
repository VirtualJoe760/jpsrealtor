"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface AISearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  initialValue?: string;
}

export default function AISearchBar({
  onSearch,
  placeholder = "Ask me anything about Coachella Valley real estate...",
  suggestions = [],
  isLoading = false,
  initialValue = "",
}: AISearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { bgSecondary, border, textPrimary, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Debounced search
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  }, [query, onSearch]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Show suggestions when focused and has suggestions
  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0 && !query);
  }, [isFocused, suggestions, query]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div
        className={`relative ${bgSecondary} ${border} rounded-2xl transition-all duration-300 ${
          isFocused
            ? isLight
              ? "ring-2 ring-blue-500 border-blue-500"
              : "ring-2 ring-emerald-500 border-emerald-500"
            : ""
        }`}
      >
        {/* AI Sparkle Icon */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
          <Sparkles
            className={`w-6 h-6 ${
              isLight ? "text-blue-500" : "text-emerald-400"
            }`}
          />
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className={`w-full pl-16 pr-32 py-5 ${bgSecondary} ${textPrimary} placeholder:${textSecondary} rounded-2xl outline-none text-lg`}
          disabled={isLoading}
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={() => setQuery("")}
            className={`absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
              isLight
                ? "hover:bg-gray-200 text-gray-500"
                : "hover:bg-gray-700 text-gray-400"
            }`}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className={`absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full mt-2 w-full ${bgSecondary} ${border} rounded-xl shadow-2xl overflow-hidden z-50`}
          >
            <div className={`p-3 ${border} border-b`}>
              <p className={`text-sm ${textSecondary} font-semibold`}>
                Popular Searches
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(suggestion);
                    onSearch(suggestion);
                    setShowSuggestions(false);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isLight
                      ? "hover:bg-blue-50 text-gray-700"
                      : "hover:bg-gray-800 text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Search
                      className={`w-4 h-4 ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Queries (shown when empty and not focused) */}
      {!query && !isFocused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex flex-wrap gap-2 justify-center"
        >
          {[
            "Best neighborhoods for families",
            "Indian lease land explained",
            "Market trends 2025",
            "First-time buyer tips",
          ].map((example, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(example);
                onSearch(example);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isLight
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400"
              }`}
            >
              {example}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
