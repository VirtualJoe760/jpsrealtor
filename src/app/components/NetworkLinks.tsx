"use client";

// src/app/components/NetworkLinks.tsx
// Dynamic cross-linking component for the ChatRealty agent network.
// Renders contextual links to other agent domains to build SEO authority.

import { useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface NetworkLink {
  name: string;
  domain: string;
  url: string;
  description: string;
  relevance: "exact" | "regional" | "network";
}

interface NetworkLinksContext {
  city?: string;
  neighborhood?: string;
  propertyType?: string;
  agentId?: string;
}

interface NetworkLinksProps {
  currentDomain: string;
  context?: NetworkLinksContext;
}

export default function NetworkLinks({ currentDomain, context = {} }: NetworkLinksProps) {
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    textPrimary,
    textSecondary,
    textMuted,
    cardBg,
    cardBorder,
    border,
    currentTheme,
  } = useThemeClasses();

  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const params = new URLSearchParams({ domain: currentDomain });
        if (context.city) params.set("city", context.city);
        if (context.neighborhood) params.set("neighborhood", context.neighborhood);
        if (context.propertyType) params.set("propertyType", context.propertyType);

        const response = await fetch(`/api/network-links?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        if (data.success && data.links) {
          setLinks(data.links);
        }
      } catch (error) {
        console.error("[NetworkLinks] Failed to load cross-links:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [currentDomain, context.city, context.neighborhood, context.propertyType]);

  // Don't render anything if no links or still loading
  if (loading || links.length === 0) return null;

  return (
    <section className="w-full py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-5">
          <h3
            className={`text-sm font-semibold uppercase tracking-wider ${textMuted}`}
          >
            Explore Our Network
          </h3>
          <div
            className={`mt-2 h-px w-12 ${
              isLight ? "bg-slate-300" : "bg-gray-700"
            }`}
          />
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <a
              key={link.domain}
              href={link.url}
              rel="noopener"
              className={`
                group block rounded-lg px-4 py-3
                border ${cardBorder}
                ${cardBg}
                transition-all duration-200
                ${
                  isLight
                    ? "hover:bg-white hover:border-blue-300 hover:shadow-md"
                    : "hover:bg-gray-800/60 hover:border-gray-600 hover:shadow-lg hover:shadow-black/20"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Relevance indicator */}
                <div
                  className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                    link.relevance === "exact"
                      ? "bg-emerald-500"
                      : link.relevance === "regional"
                      ? "bg-blue-500"
                      : isLight
                      ? "bg-slate-400"
                      : "bg-gray-600"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium ${textPrimary} group-hover:${
                      isLight ? "text-blue-600" : "text-blue-400"
                    } transition-colors`}
                  >
                    {link.name}
                  </div>
                  <div className={`text-xs ${textMuted} mt-0.5 truncate`}>
                    {link.description}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isLight ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {link.domain}
                  </div>
                </div>

                {/* Arrow icon */}
                <svg
                  className={`w-4 h-4 mt-1 flex-shrink-0 ${textMuted} opacity-0 group-hover:opacity-100 transition-opacity`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Subtle footer */}
        <p
          className={`mt-4 text-xs text-center ${
            isLight ? "text-slate-400" : "text-gray-600"
          }`}
        >
          Part of the{" "}
          <a
            href="https://chatrealty.io"
            rel="noopener"
            className={`${
              isLight
                ? "text-slate-500 hover:text-blue-600"
                : "text-gray-500 hover:text-blue-400"
            } transition-colors`}
          >
            ChatRealty
          </a>{" "}
          network
        </p>
      </div>
    </section>
  );
}
