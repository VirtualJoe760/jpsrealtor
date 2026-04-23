"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { Search, Users, X } from "lucide-react";
import AgentCard, { AgentCardProps } from "@/app/components/directory/AgentCard";

interface DirectoryResponse {
  success: boolean;
  agents: AgentCardProps[];
  filters: {
    cities: string[];
    specializations: string[];
  };
}

export default function DirectoryClient() {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    shadow,
    buttonSecondary,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [agents, setAgents] = useState<AgentCardProps[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableSpecializations, setAvailableSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedCity) params.set("city", selectedCity);
      if (selectedSpecialization) params.set("specialization", selectedSpecialization);

      const url = `/api/agents/directory${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data: DirectoryResponse = await response.json();

      if (data.success) {
        setAgents(data.agents);
        // Only update filter options on initial load (no active filters)
        if (!selectedCity && !selectedSpecialization && !searchQuery.trim()) {
          setAvailableCities(data.filters.cities);
          setAvailableSpecializations(data.filters.specializations);
        }
      } else {
        setError("Failed to load agent directory");
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError("Failed to load agent directory");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCity, selectedSpecialization]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(debouncedSearch), 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  const clearFilters = () => {
    setDebouncedSearch("");
    setSearchQuery("");
    setSelectedCity(null);
    setSelectedSpecialization(null);
  };

  const hasActiveFilters = searchQuery.trim() || selectedCity || selectedSpecialization;

  return (
    <div className="max-w-7xl mx-auto w-full min-h-screen flex flex-col pt-16 md:pt-0">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12 md:py-16">
          <div
            className={`
              inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6
              ${isLight
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-blue-900/30 text-blue-300 border border-blue-800"
              }
            `}
          >
            <Users className="w-4 h-4" />
            Agent Network
          </div>
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 ${textPrimary}`}
          >
            Find Your Local Expert
          </h1>
          <p
            className={`text-lg md:text-xl max-w-2xl mx-auto ${textSecondary}`}
          >
            Connect with verified real estate professionals who know your market
            inside and out.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 sm:px-6 lg:px-8 mb-8">
        <div
          className={`
            rounded-2xl border p-4 sm:p-6
            ${cardBg} ${cardBorder} ${shadow}
          `}
        >
          {/* Search Input */}
          <div className="relative mb-4">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`}
            />
            <input
              type="text"
              placeholder="Search by agent name or area..."
              value={debouncedSearch}
              onChange={(e) => setDebouncedSearch(e.target.value)}
              className={`
                w-full pl-12 pr-10 py-3 rounded-xl text-sm
                border outline-none transition-colors
                ${isLight
                  ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                  : "bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                }
              `}
            />
            {debouncedSearch && (
              <button
                onClick={() => setDebouncedSearch("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                  ${isLight ? "hover:bg-slate-100" : "hover:bg-gray-700"}`}
              >
                <X className={`w-4 h-4 ${textMuted}`} />
              </button>
            )}
          </div>

          {/* City Filter Pills */}
          {availableCities.length > 0 && (
            <div className="mb-3">
              <p className={`text-xs font-medium mb-2 ${textMuted}`}>Cities</p>
              <div className="flex flex-wrap gap-2">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() =>
                      setSelectedCity(selectedCity === city ? null : city)
                    }
                    className={`
                      text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${
                        selectedCity === city
                          ? "bg-blue-500 text-white border-blue-500"
                          : isLight
                          ? "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          : "bg-gray-800/70 text-gray-300 border-gray-700 hover:border-blue-500"
                      }
                    `}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specialization Filter Pills */}
          {availableSpecializations.length > 0 && (
            <div>
              <p className={`text-xs font-medium mb-2 ${textMuted}`}>
                Specializations
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSpecializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() =>
                      setSelectedSpecialization(
                        selectedSpecialization === spec ? null : spec
                      )
                    }
                    className={`
                      text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${
                        selectedSpecialization === spec
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : isLight
                          ? "bg-white text-slate-700 border-slate-300 hover:border-emerald-400"
                          : "bg-gray-800/70 text-gray-300 border-gray-700 hover:border-emerald-500"
                      }
                    `}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between">
              <p className={`text-sm ${textMuted}`}>
                {agents.length} agent{agents.length !== 1 ? "s" : ""} found
              </p>
              <button
                onClick={clearFilters}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${buttonSecondary}`}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Agent Grid */}
      <div className="px-4 sm:px-6 lg:px-8 flex-1 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`
                  rounded-2xl border overflow-hidden animate-pulse
                  ${cardBg} ${cardBorder}
                `}
              >
                <div
                  className={`aspect-[4/3] ${isLight ? "bg-slate-200" : "bg-gray-800"}`}
                />
                <div className="p-5 space-y-3">
                  <div
                    className={`h-5 w-2/3 rounded ${isLight ? "bg-slate-200" : "bg-gray-800"}`}
                  />
                  <div
                    className={`h-4 w-full rounded ${isLight ? "bg-slate-100" : "bg-gray-800/50"}`}
                  />
                  <div className="flex gap-2">
                    <div
                      className={`h-5 w-20 rounded-full ${isLight ? "bg-slate-100" : "bg-gray-800/50"}`}
                    />
                    <div
                      className={`h-5 w-16 rounded-full ${isLight ? "bg-slate-100" : "bg-gray-800/50"}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className={`text-lg ${textMuted}`}>{error}</p>
            <button
              onClick={fetchAgents}
              className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <Users className={`w-12 h-12 mx-auto mb-4 ${textMuted}`} />
            <p className={`text-lg font-medium ${textPrimary}`}>
              No agents found
            </p>
            <p className={`text-sm mt-2 ${textMuted}`}>
              {hasActiveFilters
                ? "Try adjusting your filters or search query."
                : "Check back soon as our network grows."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div
          className={`
            text-center py-6 border-t
            ${isLight ? "border-slate-200" : "border-gray-800"}
          `}
        >
          <p className={`text-sm ${textMuted}`}>
            Powered by{" "}
            <a
              href="https://chatrealty.io"
              className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
            >
              ChatRealty
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
