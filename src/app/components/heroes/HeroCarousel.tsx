"use client";

// Carousel hero — rotates through the agent's gallery photos (plus the hero
// photo) as a crossfading background, with dot indicators. Falls back to the
// full-width hero if there aren't at least 2 images.

import { useState, useEffect, useMemo } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { getHeroData, HeroShell, HeroCTAs, HeroBusinessCard } from "./heroShared";
import HeroFullWidth from "./HeroFullWidth";

export default function HeroCarousel({ agentProfile }: { agentProfile: any }) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const data = getHeroData(agentProfile, isLight);

  const images = useMemo(() => {
    const set = [data.heroImage, ...data.gallery].filter(Boolean) as string[];
    return Array.from(new Set(set));
  }, [data.heroImage, data.gallery]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length < 2) return <HeroFullWidth agentProfile={agentProfile} />;

  return (
    <HeroShell>
      {/* Crossfading slides */}
      <div className="absolute inset-0">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/70" />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/EXP-white-square.png" alt="eXp Realty" className="absolute top-6 right-6 md:top-10 md:right-10 h-16 md:h-24 w-auto object-contain opacity-95 z-20" />

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

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
          />
        ))}
      </div>

      <HeroBusinessCard data={data} className="absolute bottom-12 left-6 md:left-10 z-20 max-w-[55%]" />
    </HeroShell>
  );
}
