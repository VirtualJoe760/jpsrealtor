"use client";

import { useState, useEffect } from "react";

export interface AgentProfile {
  name: string;
  email: string;
  phone: string;
  brokerageName: string;
  licenseNumber: string;
  headshot: string;
  heroPhoto: string;
  bio: string;
  headline: string;
  tagline: string;
  brandColor: string;
  secondaryColor: string;
  customDomain: string;
  subdomain: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
  };
  valuePropositions: Array<{ icon?: string; title: string; description: string }>;
  stats: Array<{ label: string; value: string; icon?: string }>;
  specializations: string[];
  serviceAreas: string[];
}

const FALLBACK: AgentProfile = {
  name: "Joseph Sardella",
  email: "josephsardella@gmail.com",
  phone: "(760) 333-3676",
  brokerageName: "eXp Realty",
  licenseNumber: "02106916",
  headshot: "",
  heroPhoto: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/misc/real-estate/front-yard/front-yard_00017_.png",
  bio: "With over 30 years of experience in the Coachella Valley, Joseph Sardella brings unmatched local expertise and a family legacy in real estate dating back to the 1970s.",
  headline: "Your Coachella Valley Real Estate Expert",
  tagline: "Local expertise. Proven results.",
  brandColor: "#10b981",
  secondaryColor: "#06b6d4",
  customDomain: "jpsrealtor.com",
  subdomain: "joseph",
  socialMedia: {
    instagram: "https://instagram.com/jpsrealtor",
    facebook: "https://facebook.com/jpsrealtor",
    youtube: "https://youtube.com/@jpsrealtor",
  },
  valuePropositions: [
    { title: "Local Market Expert", description: "Born and raised in the Coachella Valley with deep knowledge of every neighborhood, HOA, and community." },
    { title: "Expert Negotiator", description: "Strategic negotiation skills that consistently deliver favorable outcomes for my clients." },
    { title: "White-Glove Service", description: "Personalized attention from first showing to closing day and beyond." },
    { title: "Exclusive Access", description: "Off-market listings, pocket listings, and connections that only come from decades of local relationships." },
  ],
  stats: [
    { label: "Years Experience", value: "30+" },
    { label: "Homes Sold", value: "500+" },
    { label: "5-Star Reviews", value: "150+" },
  ],
  specializations: ["Luxury Homes", "Golf Communities", "Investment Properties", "First-Time Buyers"],
  serviceAreas: ["Palm Desert", "Indian Wells", "La Quinta", "Rancho Mirage", "Palm Springs"],
};

let cachedProfile: AgentProfile | null = null;

export interface AgentPublicResponse {
  profile?: any;
  subscription?: any;
  hasActiveSubscription?: boolean;
}

// Shared client fetch for /api/agent/public so the homepage, the layout wrapper,
// and this hook don't each fire (and re-fire under React StrictMode) their own
// request — on the owner domain all three hit the same URL. Memoizes the in-flight
// promise per URL; a failed fetch is evicted so a later caller can retry.
const agentPublicCache = new Map<string, Promise<AgentPublicResponse | null>>();

export function fetchAgentPublic(subParam = ""): Promise<AgentPublicResponse | null> {
  const url = `/api/agent/public${subParam}`;
  let inflight = agentPublicCache.get(url);
  if (!inflight) {
    inflight = fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data == null) agentPublicCache.delete(url);
        return data;
      });
    agentPublicCache.set(url, inflight);
  }
  return inflight;
}

export function useAgentProfile() {
  const [agent, setAgent] = useState<AgentProfile>(cachedProfile || FALLBACK);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (cachedProfile) return;

    fetchAgentPublic()
      .then(raw => {
        if (!raw) return;
        // The route returns { profile: { ..., agentProfile: { ... } } }.
        // Unwrap the envelope so we read the actual shape.
        const data = raw.profile || raw;
        const ap = data.agentProfile || {};
        const profile: AgentProfile = {
          name: data.name || FALLBACK.name,
          email: data.email || FALLBACK.email,
          phone: data.phone || ap.cellPhone || ap.phone || FALLBACK.phone,
          brokerageName: data.brokerageName || ap.brokerageName || FALLBACK.brokerageName,
          licenseNumber: data.licenseNumber || ap.licenseNumber || FALLBACK.licenseNumber,
          headshot: ap.headshot || FALLBACK.headshot,
          heroPhoto: ap.heroPhoto || FALLBACK.heroPhoto,
          bio: ap.bio || FALLBACK.bio,
          headline: ap.heroHeadline || ap.headline || FALLBACK.headline,
          tagline: ap.tagline || FALLBACK.tagline,
          brandColor: ap.brandColor || FALLBACK.brandColor,
          secondaryColor: ap.secondaryColor || FALLBACK.secondaryColor,
          customDomain: ap.customDomain || FALLBACK.customDomain,
          subdomain: ap.subdomain || FALLBACK.subdomain,
          socialMedia: {
            instagram: ap.instagram || ap.socialMedia?.instagram || FALLBACK.socialMedia.instagram,
            facebook: ap.facebook || ap.socialMedia?.facebook || FALLBACK.socialMedia.facebook,
            youtube: ap.youtube || ap.socialMedia?.youtube || FALLBACK.socialMedia.youtube,
            linkedin: ap.linkedin || ap.socialMedia?.linkedin || FALLBACK.socialMedia.linkedin,
            twitter: ap.twitter || ap.socialMedia?.twitter || FALLBACK.socialMedia.twitter,
          },
          valuePropositions: ap.valuePropositions?.length > 0
            ? ap.valuePropositions
            : FALLBACK.valuePropositions,
          stats: ap.stats?.length > 0 ? ap.stats : FALLBACK.stats,
          specializations: ap.specializations?.length > 0
            ? ap.specializations
            : FALLBACK.specializations,
          serviceAreas: ap.serviceAreas?.map((a: any) => a.name || a) || FALLBACK.serviceAreas,
        };
        cachedProfile = profile;
        setAgent(profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { agent, loading };
}
