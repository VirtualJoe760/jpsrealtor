"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import { useTheme } from "@/app/contexts/ThemeContext";
import dynamic from "next/dynamic";
import MarketSnapshot from "@/app/components/buy/MarketSnapshot";
import FeaturedListings from "@/app/components/buy/FeaturedListings";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import BuyingJourney from "@/app/components/buy/BuyingJourney";
import ContactCTA from "@/app/components/buy/ContactCTA";

// Lazy-load 3D hero (heavy dependency)
const BuyPageHero3D = dynamic(() => import("@/app/components/buy/BuyPageHero3D"), {
  ssr: false,
  loading: () => <div className="h-screen bg-black" />,
});

// ─── Scroll reveal wrapper ───
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ───

interface BuyPageClientProps {
  cityId: string;
  cityName: string;
  countyName: string;
  population?: number;
  about?: string;
  description?: string;
}

export default function BuyPageClient({
  cityId,
  cityName,
  countyName,
  population,
  about,
  description,
}: BuyPageClientProps) {
  const { agent } = useAgentProfile();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen" data-page="buy">
      {/* 1. Hero — Full viewport, 3D interactive */}
      <BuyPageHero3D cityName={cityName} cityId={cityId} agent={agent} />

      {/* Content sections */}
      <div className="max-w-6xl mx-auto px-4 space-y-20 py-16">
        {/* 2. Market Snapshot */}
        <Reveal>
          <MarketSnapshot cityId={cityId} cityName={cityName} />
        </Reveal>

        {/* 3. Featured Listings */}
        <Reveal>
          <FeaturedListings cityId={cityId} cityName={cityName} />
        </Reveal>

        {/* 4. Why Work With Agent */}
        <Reveal>
          <AgentValueProps agent={agent} />
        </Reveal>

        {/* 5. Buying Journey */}
        <Reveal>
          <BuyingJourney brandColor={agent.brandColor} />
        </Reveal>

        {/* 6. About City */}
        {(about || description) && (
          <Reveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
                About {cityName}
              </h2>
              {population && (
                <p className={`text-sm mb-4 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                  Population: {population.toLocaleString()} · {countyName} County
                </p>
              )}
              <div className={`text-sm leading-relaxed space-y-3 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                {(about || description || "").split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* 7. Contact CTA */}
        <Reveal>
          <ContactCTA agent={agent} cityName={cityName} />
        </Reveal>
      </div>
    </div>
  );
}
