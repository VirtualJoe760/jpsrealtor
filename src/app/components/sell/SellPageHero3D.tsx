"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";

export default function SellPageHero3D({
  cityName,
  cityId,
  agent,
}: {
  cityName: string;
  cityId: string;
  agent: AgentProfile;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Use recently sold listings to convey "we sell homes here"
  useEffect(() => {
    fetch(`/api/cities/${cityId}/listings?limit=8&propertyType=sale&sort=price-high`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.listings) return;
        const urls = data.listings
          .map((l: any) => l.photoUrl || l.primaryPhotoUrl)
          .filter(Boolean);
        if (urls.length > 0) setPhotos(urls);
      })
      .catch(() => {});
  }, [cityId]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhoto(prev => (prev + 1) % photos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <section className="relative w-full h-[85vh] min-h-[550px] overflow-hidden bg-black">
      <div className="absolute inset-0">
        {photos.length > 0 ? (
          photos.map((photo, i) => (
            <div
              key={photo}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === currentPhoto ? 1 : 0 }}
            >
              <Image
                src={photo}
                alt={`${cityName} property ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="100vw"
                unoptimized={photo.includes("media.crmls.org") || photo.includes("sparkplatform.com")}
              />
            </div>
          ))
        ) : (
          <Image
            src={agent.heroPhoto}
            alt={cityName}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />

      {photos.length > 1 && (
        <div className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-medium border border-white/10">
          {currentPhoto + 1} / {photos.length}
        </div>
      )}

      <div className="relative z-20 h-full flex flex-col justify-end pb-12 md:pb-16 px-6 max-w-5xl mx-auto">
        <div className="space-y-3">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Sell Your Home in
          </p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] text-white drop-shadow-2xl">
            {cityName}
          </h1>

          <p className="text-lg md:text-xl text-white/90 font-medium pt-1">
            with{" "}
            <span style={{ color: agent.brandColor }} className="font-bold">
              {agent.name}
            </span>
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link
              href="#sell-intake"
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-2xl hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})`,
              }}
            >
              Get Free Home Valuation
            </Link>
            <Link
              href="/book-appointment"
              className="px-6 py-3 rounded-xl font-semibold text-white border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all hover:scale-105"
            >
              Book Consultation
            </Link>
          </div>

          <div className="flex items-center gap-4 pt-5">
            {agent.headshot && (
              <div
                className={`relative w-16 h-16 rounded-full overflow-hidden border border-white/30 shadow-lg ${
                  isLight ? "bg-white" : "bg-neutral-800"
                }`}
              >
                <Image src={agent.headshot} alt={agent.name} fill sizes="64px" className="object-cover" />
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-white">{agent.name}</p>
              <p className="text-xs text-white/70">
                {agent.brokerageName} · DRE# {agent.licenseNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
