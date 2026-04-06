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
  headshot: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png",
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

export function useAgentProfile() {
  const [agent, setAgent] = useState<AgentProfile>(cachedProfile || FALLBACK);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (cachedProfile) return;

    fetch("/api/agent/public")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const profile: AgentProfile = {
          name: data.name || FALLBACK.name,
          email: data.email || FALLBACK.email,
          phone: data.phone || data.agentProfile?.cellPhone || FALLBACK.phone,
          brokerageName: data.brokerageName || FALLBACK.brokerageName,
          licenseNumber: data.licenseNumber || FALLBACK.licenseNumber,
          headshot: data.agentProfile?.headshot || FALLBACK.headshot,
          heroPhoto: data.agentProfile?.heroPhoto || FALLBACK.heroPhoto,
          bio: data.agentProfile?.bio || FALLBACK.bio,
          headline: data.agentProfile?.heroHeadline || data.agentProfile?.headline || FALLBACK.headline,
          tagline: data.agentProfile?.tagline || FALLBACK.tagline,
          brandColor: data.agentProfile?.brandColor || FALLBACK.brandColor,
          secondaryColor: data.agentProfile?.secondaryColor || FALLBACK.secondaryColor,
          customDomain: data.agentProfile?.customDomain || FALLBACK.customDomain,
          subdomain: data.agentProfile?.subdomain || FALLBACK.subdomain,
          socialMedia: data.agentProfile?.socialMedia || FALLBACK.socialMedia,
          valuePropositions: data.agentProfile?.valuePropositions?.length > 0
            ? data.agentProfile.valuePropositions
            : FALLBACK.valuePropositions,
          stats: data.agentProfile?.stats?.length > 0
            ? data.agentProfile.stats
            : FALLBACK.stats,
          specializations: data.agentProfile?.specializations?.length > 0
            ? data.agentProfile.specializations
            : FALLBACK.specializations,
          serviceAreas: data.agentProfile?.serviceAreas?.map((a: any) => a.name || a) || FALLBACK.serviceAreas,
        };
        cachedProfile = profile;
        setAgent(profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { agent, loading };
}
