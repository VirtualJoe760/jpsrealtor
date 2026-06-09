"use client";

// Full-Width Image hero — full-bleed theme-aware photo, centered headline + CTAs,
// agent business card pinned bottom-left.

import { useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { getHeroData, HeroShell, HeroCTAs, HeroBusinessCard } from "./heroShared";

export default function HeroFullWidth({ agentProfile }: { agentProfile: any }) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const data = getHeroData(agentProfile, isLight);
  const [loaded, setLoaded] = useState(false);

  return (
    <HeroShell>
      {/* Background */}
      {data.heroImage ? (
        <div className="absolute inset-0">
          {!loaded && <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-500 animate-pulse" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.heroImage}
            alt="Hero background"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${data.brandColor}, #111827)` }} />
      )}

      {/* eXp logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/EXP-white-square.png" alt="eXp Realty" className="absolute top-6 right-6 md:top-10 md:right-10 h-16 md:h-24 w-auto object-contain opacity-95 z-20" />

      {/* Centered content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <h1
          className="text-4xl md:text-6xl xl:text-7xl font-serif text-white mb-5 leading-tight max-w-4xl"
          style={{ fontFamily: "Georgia, serif", textShadow: "2px 2px 14px rgba(0,0,0,0.9)" }}
          dangerouslySetInnerHTML={{ __html: data.headline || "Your next property,<br/>intelligently matched." }}
        />
        {data.tagline && (
          <p className="text-lg md:text-2xl text-white/90 mb-8 max-w-2xl" style={{ textShadow: "1px 1px 10px rgba(0,0,0,0.9)" }}>
            {data.tagline}
          </p>
        )}
        <HeroCTAs isLight={isLight} align="center" />
      </div>

      {/* Business card */}
      <HeroBusinessCard data={data} className="absolute bottom-6 left-6 md:bottom-8 md:left-10 z-20 max-w-[60%]" />
    </HeroShell>
  );
}
