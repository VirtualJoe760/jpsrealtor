"use client";

// Spotlight hero — centered, personal. Circular headshot, headline, tagline,
// CTAs and an optional stats row over a subtle brand gradient. Theme-aware.

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { getHeroData, HeroShell, HeroCTAs } from "./heroShared";

export default function HeroSpotlight({ agentProfile }: { agentProfile: any }) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const data = getHeroData(agentProfile, isLight);

  const text = isLight ? "text-gray-900" : "text-white";
  const subtext = isLight ? "text-gray-600" : "text-gray-300";

  return (
    <HeroShell bare className={isLight ? "bg-gradient-to-b from-gray-50 to-gray-100" : "bg-gradient-to-b from-neutral-900 to-black"}>
      {/* Brand glow */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(80% 60% at 50% 0%, ${data.brandColor}22 0%, transparent 60%)` }}
      />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        {data.headshot && (
          <div
            className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden mb-6 shadow-xl ring-4"
            style={{ borderColor: data.brandColor, boxShadow: `0 0 0 4px ${data.brandColor}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.headshot} alt={data.name || "Agent"} className="w-full h-full object-cover" />
          </div>
        )}

        {data.name && <div className={`text-sm md:text-base font-semibold tracking-widest uppercase mb-2`} style={{ color: data.brandColor }}>{data.name}</div>}

        <h1
          className={`text-3xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4 max-w-3xl ${text}`}
          dangerouslySetInnerHTML={{ __html: data.headline || "Let's find your<br/>next home." }}
        />
        {data.tagline && <p className={`text-base md:text-xl mb-8 max-w-xl ${subtext}`}>{data.tagline}</p>}

        <HeroCTAs isLight={isLight} align="center" />

        {data.stats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-10">
            {data.stats.slice(0, 4).map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold" style={{ color: data.brandColor }}>{s.value}</div>
                <div className={`text-xs md:text-sm ${subtext}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </HeroShell>
  );
}
