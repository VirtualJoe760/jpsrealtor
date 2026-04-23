"use client";

import React from "react";
import Image from "next/image";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { MapPin, ExternalLink } from "lucide-react";

export interface AgentCardProps {
  id: string;
  name: string;
  headshot: string | null;
  headline: string | null;
  tagline: string | null;
  serviceAreas: Array<{ name: string; type: string }>;
  specializations: string[];
  customDomain: string | null;
  subdomain: string | null;
  socialMedia: Record<string, string>;
  certifications: Array<{ name: string; issuedBy: string; year: number }>;
}

export default function AgentCard({ agent }: { agent: AgentCardProps }) {
  const {
    cardBg,
    cardBorder,
    cardHover,
    textPrimary,
    textSecondary,
    textMuted,
    shadow,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Build the agent's website URL
  const agentUrl = agent.customDomain
    ? `https://${agent.customDomain}`
    : agent.subdomain
    ? `https://${agent.subdomain}.chatrealty.io`
    : null;

  // Fallback avatar with initials
  const initials = agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden transition-all duration-300
        ${cardBg} ${cardBorder} ${cardHover} ${shadow}
        flex flex-col
      `}
    >
      {/* Headshot / Avatar */}
      <div
        className={`
          relative w-full aspect-[4/3] flex items-center justify-center
          ${isLight ? "bg-slate-100" : "bg-gray-800"}
        `}
      >
        {agent.headshot ? (
          <Image
            src={agent.headshot}
            alt={`${agent.name} headshot`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span
            className={`
              text-4xl font-bold select-none
              ${isLight ? "text-slate-400" : "text-gray-500"}
            `}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Name & headline */}
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>
            {agent.name}
          </h3>
          {agent.headline && (
            <p className={`text-sm mt-1 ${textSecondary}`}>
              {agent.headline}
            </p>
          )}
          {agent.tagline && (
            <p className={`text-xs mt-1 italic ${textMuted}`}>
              {agent.tagline}
            </p>
          )}
        </div>

        {/* Service Areas */}
        {agent.serviceAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.serviceAreas.slice(0, 5).map((area) => (
              <span
                key={area.name}
                className={`
                  inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                  ${
                    isLight
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-blue-900/30 text-blue-300 border border-blue-800"
                  }
                `}
              >
                <MapPin className="w-3 h-3" />
                {area.name}
              </span>
            ))}
            {agent.serviceAreas.length > 5 && (
              <span className={`text-xs ${textMuted}`}>
                +{agent.serviceAreas.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Specializations */}
        {agent.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.specializations.slice(0, 4).map((spec) => (
              <span
                key={spec}
                className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${
                    isLight
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-emerald-900/30 text-emerald-300 border border-emerald-800"
                  }
                `}
              >
                {spec}
              </span>
            ))}
            {agent.specializations.length > 4 && (
              <span className={`text-xs ${textMuted}`}>
                +{agent.specializations.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Certifications (compact) */}
        {agent.certifications.length > 0 && (
          <p className={`text-xs ${textMuted}`}>
            {agent.certifications.map((c) => c.name).join(" | ")}
          </p>
        )}

        {/* Spacer pushes button to bottom */}
        <div className="flex-1" />

        {/* Visit Website CTA */}
        {agentUrl && (
          <a
            href={agentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center justify-center gap-2
              w-full mt-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition-colors duration-200
              bg-blue-500 hover:bg-blue-400 text-white
            `}
          >
            <ExternalLink className="w-4 h-4" />
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
}
