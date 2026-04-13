"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import MarketSnapshot from "@/app/components/buy/MarketSnapshot";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import SellingJourney from "@/app/components/sell/SellingJourney";
import SellIntakeCTA from "@/app/components/sell/SellIntakeCTA";
import { trackViewContent } from "@/lib/meta-pixel";

interface SubdivisionSellPageClientProps {
  subdivisionName: string;
  cityName: string;
  cityId: string;
  slug: string;
  region: string;
}

export default function SubdivisionSellPageClient({
  subdivisionName,
  cityName,
  cityId,
  slug,
  region,
}: SubdivisionSellPageClientProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { agent } = useAgentProfile();

  useEffect(() => {
    trackViewContent({
      listingKey: `sell-${slug}`,
      address: `Sell in ${subdivisionName}`,
      city: cityName,
      subdivision: subdivisionName,
    });
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const [mounted, setMounted] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch(`/api/subdivisions/${slug}/listings?limit=8&propertyType=A&sort=price-high&skipStats=true`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.listings) return;
        const urls = data.listings
          .map((l: any) => {
            const media = l.media || l.Media;
            if (media && media.length > 0) {
              const primary = media.find((m: any) =>
                (m.mediaCategory || m.MediaCategory || "").toLowerCase().includes("primary")
              ) || media[0];
              return primary?.uri1024 || primary?.Uri1024 || primary?.uri800 || primary?.Uri800 || primary?.uri640 || primary?.Uri640;
            }
            return l.photoUrl || l.primaryPhotoUrl;
          })
          .filter(Boolean);
        if (urls.length > 0) setPhotos(urls);
      })
      .catch(() => {});
  }, [slug, mounted]);

  // Auto-rotate photos
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhoto((prev) => (prev + 1) % photos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <div className="min-h-screen" data-page="subdivision-sell">
      {/* Hero with Subdivision Listing Photos */}
      <section className="relative w-full h-[85vh] min-h-[550px] overflow-hidden bg-black">
        {/* Slideshow — only render after mount to avoid hydration mismatch */}
        <div className="absolute inset-0" suppressHydrationWarning>
          {mounted && photos.length > 0 ? (
            photos.map((photo, i) => (
              <div
                key={photo}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: i === currentPhoto ? 1 : 0 }}
              >
                <Image
                  src={photo}
                  alt={`${subdivisionName} property ${i + 1}`}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  sizes="100vw"
                  unoptimized={
                    photo.includes("media.crmls.org") ||
                    photo.includes("sparkplatform.com")
                  }
                />
              </div>
            ))
          ) : agent.heroPhoto ? (
            <Image
              src={agent.heroPhoto}
              alt={subdivisionName}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : null}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />

        {/* Photo counter */}
        {photos.length > 1 && (
          <div className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-medium border border-white/10">
            {currentPhoto + 1} / {photos.length}
          </div>
        )}

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-end pb-12 md:pb-16 px-6 max-w-5xl mx-auto">
          <div className="space-y-3">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Sell Your Home in
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] text-white drop-shadow-2xl">
              {subdivisionName}
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-medium pt-1">
              {cityName}, {region} • with{" "}
              <span
                style={{ color: agent.brandColor }}
                className="font-bold"
              >
                {agent.name}
              </span>
            </p>

            <div className="flex flex-wrap gap-3 pt-3">
              <a
                href="#sell-intake"
                className="px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-2xl hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})`,
                }}
              >
                Get Free Home Valuation
              </a>
              <Link
                href={`/neighborhoods/${cityId}/${slug}`}
                className="px-6 py-3 rounded-xl font-semibold text-white border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all hover:scale-105"
              >
                View {subdivisionName} Market Data
              </Link>
            </div>

            {/* Agent badge */}
            <div className="flex items-center gap-4 pt-5">
              {agent.headshot && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/30 shadow-lg bg-neutral-800">
                  <Image
                    src={agent.headshot}
                    alt={agent.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-white font-bold text-lg">{agent.name}</p>
                {agent.brokerageName && (
                  <p className="text-white/70 text-sm">
                    {agent.brokerageName}
                    {agent.licenseNumber && ` • DRE# ${agent.licenseNumber}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body — mirrors city sell page structure */}
      <div className="max-w-5xl mx-auto mt-16 space-y-16 px-4">
        <MarketSnapshot cityId={cityId} cityName={subdivisionName} />
        <AgentValueProps agent={agent} />
        <SellingJourney brandColor={agent.brandColor} />
        <SellIntakeCTA
          agent={agent}
          cityName={subdivisionName}
          cityId={cityId}
        />
      </div>
    </div>
  );
}
