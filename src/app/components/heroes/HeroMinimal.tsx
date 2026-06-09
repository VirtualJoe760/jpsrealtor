"use client";

// Minimal Card hero — a clean, theme-aware brand panel (no full-bleed photo).
// Headline + tagline + stats + CTAs on the left, a framed headshot/photo on the
// right. Text adapts to light/dark. Good for a polished, editorial look.

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { getHeroData, HeroShell, HeroCTAs } from "./heroShared";

export default function HeroMinimal({ agentProfile }: { agentProfile: any }) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const data = getHeroData(agentProfile, isLight);
  const portrait = data.headshot || data.heroImage;

  const text = isLight ? "text-gray-900" : "text-white";
  const subtext = isLight ? "text-gray-600" : "text-gray-300";

  return (
    <HeroShell
      bare
      className={isLight ? "bg-white" : "bg-neutral-900"}
    >
      {/* Soft brand wash */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{ background: `radial-gradient(120% 120% at 100% 0%, ${data.brandColor} 0%, transparent 55%)` }}
      />

      <div className="relative z-10 h-full grid grid-cols-1 md:grid-cols-2">
        {/* Left: copy */}
        <div className="flex flex-col justify-center px-8 md:px-14 py-10">
          {data.name && (
            <span className="text-xs md:text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: data.brandColor }}>
              {data.brokerageName ? `${data.name} · ${data.brokerageName}` : data.name}
            </span>
          )}
          <h1
            className={`text-3xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4 ${text}`}
            dangerouslySetInnerHTML={{ __html: data.headline || "Real estate,<br/>done right." }}
          />
          {data.tagline && <p className={`text-base md:text-xl mb-6 max-w-md ${subtext}`}>{data.tagline}</p>}

          {data.stats.length > 0 && (
            <div className="flex flex-wrap gap-6 mb-8">
              {data.stats.slice(0, 3).map((s, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-extrabold" style={{ color: data.brandColor }}>{s.value}</div>
                  <div className={`text-xs md:text-sm ${subtext}`}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <HeroCTAs isLight={isLight} />

          {data.licenseNumber && (
            <div className={`mt-6 text-xs ${subtext}`}>DRE# {data.licenseNumber}{data.phone ? ` · ${data.phone}` : ""}</div>
          )}
        </div>

        {/* Right: portrait */}
        <div className="relative hidden md:block">
          {portrait ? (
            <div className="absolute inset-0 p-8">
              <div
                className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundImage: `url(${portrait})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${data.brandColor}33, transparent)` }} />
          )}
        </div>
      </div>
    </HeroShell>
  );
}
