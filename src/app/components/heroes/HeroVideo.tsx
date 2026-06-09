"use client";

// Video hero — looping muted background video (agentProfile.videoIntro) with an
// overlay headline + CTAs. Falls back to the full-width image hero if the agent
// hasn't uploaded a video.

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { getHeroData, HeroShell, HeroCTAs, HeroBusinessCard } from "./heroShared";
import HeroFullWidth from "./HeroFullWidth";

export default function HeroVideo({ agentProfile }: { agentProfile: any }) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const data = getHeroData(agentProfile, isLight);

  if (!data.video) return <HeroFullWidth agentProfile={agentProfile} />;

  return (
    <HeroShell>
      <div className="absolute inset-0">
        <video
          src={data.video}
          poster={data.heroImage}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/70" />
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

      <HeroBusinessCard data={data} className="absolute bottom-6 left-6 md:bottom-8 md:left-10 z-20 max-w-[60%]" />
    </HeroShell>
  );
}
