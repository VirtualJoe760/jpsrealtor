"use client";

// Picks the hero variant for the current tenant based on agentProfile.heroStyle.
// "split" (default) reuses the original AgentHero, which also handles the
// loading skeleton when agentProfile is still null.

import AgentHero from "@/app/components/insights/AgentHero";
import HeroFullWidth from "./HeroFullWidth";
import HeroVideo from "./HeroVideo";
import HeroCarousel from "./HeroCarousel";
import HeroMinimal from "./HeroMinimal";
import HeroSpotlight from "./HeroSpotlight";

export type HeroStyle = "split" | "fullwidth" | "video" | "carousel" | "minimal" | "spotlight";

export default function HeroRenderer({ agentProfile }: { agentProfile: any }) {
  const style: HeroStyle = agentProfile?.agentProfile?.heroStyle || "split";

  switch (style) {
    case "fullwidth":
      return <HeroFullWidth agentProfile={agentProfile} />;
    case "video":
      return <HeroVideo agentProfile={agentProfile} />;
    case "carousel":
      return <HeroCarousel agentProfile={agentProfile} />;
    case "minimal":
      return <HeroMinimal agentProfile={agentProfile} />;
    case "spotlight":
      return <HeroSpotlight agentProfile={agentProfile} />;
    case "split":
    default:
      return <AgentHero agentProfile={agentProfile} />;
  }
}
