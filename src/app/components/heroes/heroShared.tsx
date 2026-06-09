"use client";

// Shared building blocks for the selectable hero styles. Every hero variant
// pulls its data from the same flattened `agentProfile` object (from
// /api/agent/public) and reuses the same CTA cluster + outer shell so they size
// identically and work inside both the sidebar and navbar layouts.

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, UserPlus, Search } from "lucide-react";

export interface HeroData {
  name?: string;
  brokerageName?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  headline?: string;
  tagline?: string;
  headshot?: string;
  heroImage?: string;       // theme-resolved background
  gallery: string[];
  video?: string;
  stats: { label?: string; value?: string; icon?: string }[];
  brandColor: string;
  secondaryColor?: string;
  accentColor?: string;
}

/** Normalize the flattened agent profile into the fields heroes need. */
export function getHeroData(agentProfile: any, isLight: boolean): HeroData {
  const ap = agentProfile?.agentProfile || {};
  const heroLight = ap.heroImage || ap.heroPhoto;
  const heroDark = ap.heroImageDark || ap.heroPhotoDark;
  return {
    name: agentProfile?.name,
    brokerageName: agentProfile?.brokerageName || ap.brokerageName,
    licenseNumber: agentProfile?.licenseNumber || ap.licenseNumber,
    phone: agentProfile?.phone || ap.cellPhone || ap.phone,
    email: agentProfile?.email,
    headline: ap.heroHeadline || ap.headline,
    tagline: ap.tagline,
    headshot: ap.headshot || ap.profilePhoto,
    heroImage: isLight ? heroLight : (heroDark || heroLight),
    gallery: (ap.galleryPhotos || []).filter(Boolean),
    video: ap.videoIntro,
    stats: (ap.stats || []).filter((s: any) => s && (s.value || s.label)),
    brandColor: ap.brandColor || "#2563eb",
    secondaryColor: ap.secondaryColor,
    accentColor: ap.accentColor,
  };
}

/** Consistent outer shell so every hero is the same size + nav-safe. */
export function HeroShell({
  children,
  className = "",
  bare = false,
}: {
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <section className="relative w-full overflow-hidden pt-0 md:pt-16 pb-0 md:pb-16 px-0 md:px-4">
      <div className="w-full md:max-w-7xl md:mx-auto">
        <div
          className={`relative overflow-hidden rounded-none md:rounded-2xl h-[65vh] md:h-[70vh] ${bare ? "" : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"} ${className}`}
          style={{ minHeight: "500px" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/** The Chat / Create-account + Map-search CTAs, shared by all heroes. */
export function HeroCTAs({
  isLight,
  size = "lg",
  align = "left",
}: {
  isLight: boolean;
  size?: "sm" | "lg";
  align?: "left" | "center";
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const pad = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm";
  const icon = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const primary = isLight
    ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50"
    : "bg-emerald-600/90 hover:bg-emerald-700/90 border-emerald-500/50";

  return (
    <div className={`flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""}`}>
      <button
        onClick={() => router.push(session ? "/chap" : "/auth/signin")}
        className={`group flex items-center justify-center gap-2 ${pad} backdrop-blur-sm border-2 text-white font-medium rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${primary}`}
      >
        {session ? <MessageCircle className={icon} /> : <UserPlus className={icon} />}
        <span>{session ? "Chat" : "Create Free Account"}</span>
      </button>
      <button
        onClick={() => router.push("/chap?view=map")}
        className={`group flex items-center justify-center gap-2 ${pad} bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white font-medium rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}
      >
        <Search className={icon} />
        <span>Map Search</span>
      </button>
    </div>
  );
}

/** Small agent business-card block reused by image-backed heroes. */
export function HeroBusinessCard({ data, className = "" }: { data: HeroData; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 text-white ${className}`} style={{ textShadow: "1px 1px 8px rgba(0,0,0,0.8)" }}>
      {data.name && <div className="text-xl md:text-2xl font-bold tracking-wide">{data.name}</div>}
      {data.brokerageName && <div className="text-sm md:text-base font-medium opacity-90">{data.brokerageName}</div>}
      <div className="w-16 h-0.5 bg-white/50 my-1" />
      {data.licenseNumber && <div className="text-xs md:text-sm font-medium">DRE# {data.licenseNumber}</div>}
      {data.phone && <div className="text-xs md:text-sm">{data.phone}</div>}
      {data.email && <div className="text-xs md:text-sm opacity-80">{data.email}</div>}
    </div>
  );
}
