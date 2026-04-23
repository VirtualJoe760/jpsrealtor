// src/lib/network-links.ts
// Utility functions for ChatRealty network cross-linking

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export interface NetworkLink {
  name: string;
  domain: string;
  url: string;
  description: string;
  relevance: "exact" | "regional" | "network";
}

export interface NetworkLinkContext {
  city?: string;
  neighborhood?: string;
  propertyType?: string;
  agentId?: string;
}

const HUB_DOMAIN = "chatrealty.io";

/**
 * Fetch all active agent domains from the database.
 * Returns agents who have a custom domain or subdomain configured.
 */
export async function getNetworkDomains(): Promise<
  Array<{
    name: string;
    domain: string;
    subdomain?: string;
    serviceAreas: Array<{ name: string; type: string }>;
    specializations: string[];
    agentId: string;
  }>
> {
  await dbConnect();

  const agents = await User.find(
    {
      roles: "realEstateAgent",
      $or: [
        { "agentProfile.customDomain": { $exists: true, $ne: "" } },
        { "agentProfile.subdomain": { $exists: true, $ne: "" } },
      ],
    },
    {
      name: 1,
      "agentProfile.customDomain": 1,
      "agentProfile.subdomain": 1,
      "agentProfile.serviceAreas": 1,
      "agentProfile.specializations": 1,
      "agentProfile.tagline": 1,
      "agentProfile.metaDescription": 1,
    }
  ).lean();

  return agents.map((agent: any) => {
    const profile = agent.agentProfile || {};
    const domain = profile.customDomain || `${profile.subdomain}.${HUB_DOMAIN}`;

    return {
      name: agent.name || "ChatRealty Agent",
      domain,
      subdomain: profile.subdomain,
      serviceAreas: profile.serviceAreas || [],
      specializations: profile.specializations || [],
      agentId: agent._id.toString(),
    };
  });
}

/**
 * Generate contextual cross-links for a given domain.
 * Prioritizes agents with overlapping service areas, then fills with
 * network-level links up to the max count.
 */
export async function generateCrossLinks(
  currentDomain: string,
  context: NetworkLinkContext,
  maxLinks: number = 8
): Promise<NetworkLink[]> {
  const links: NetworkLink[] = [];
  const allDomains = await getNetworkDomains();

  // Filter out the current domain
  const otherDomains = allDomains.filter(
    (d) =>
      d.domain !== currentDomain &&
      d.agentId !== context.agentId
  );

  // Score and sort by relevance
  const scored = otherDomains.map((agent) => {
    let score = 0;
    let relevance: NetworkLink["relevance"] = "network";

    // Exact city match in service areas
    if (context.city) {
      const cityMatch = agent.serviceAreas.some(
        (sa) =>
          sa.name.toLowerCase() === context.city!.toLowerCase() &&
          sa.type === "city"
      );
      if (cityMatch) {
        score += 10;
        relevance = "exact";
      }
    }

    // Neighborhood/subdivision match (check if any service area contains it)
    if (context.neighborhood) {
      const neighborhoodMatch = agent.serviceAreas.some(
        (sa) =>
          sa.name.toLowerCase().includes(context.neighborhood!.toLowerCase()) ||
          context.neighborhood!.toLowerCase().includes(sa.name.toLowerCase())
      );
      if (neighborhoodMatch) {
        score += 15;
        relevance = "exact";
      }
    }

    // County-level overlap (regional relevance)
    if (context.city && agent.serviceAreas.length > 0) {
      const hasCountyMatch = agent.serviceAreas.some(
        (sa) => sa.type === "county"
      );
      if (hasCountyMatch && relevance !== "exact") {
        score += 5;
        relevance = "regional";
      }
    }

    // Property type specialization match
    if (context.propertyType) {
      const specMatch = agent.specializations.some(
        (s) => s.toLowerCase().includes(context.propertyType!.toLowerCase())
      );
      if (specMatch) {
        score += 3;
      }
    }

    // Base score for being in the network
    score += 1;

    return { agent, score, relevance };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Build links from scored agents
  for (const { agent, relevance } of scored) {
    if (links.length >= maxLinks - 1) break; // Reserve 1 slot for hub

    const protocol = agent.domain.includes("localhost") ? "http" : "https";
    let description = `Real estate services`;

    if (agent.serviceAreas.length > 0) {
      const areaNames = agent.serviceAreas
        .slice(0, 3)
        .map((sa) => sa.name)
        .join(", ");
      description = `Serving ${areaNames}`;
    }

    if (agent.specializations.length > 0) {
      description += ` - ${agent.specializations.slice(0, 2).join(", ")}`;
    }

    links.push({
      name: agent.name,
      domain: agent.domain,
      url: `${protocol}://${agent.domain}`,
      description,
      relevance,
    });
  }

  // Always include the hub domain (unless it IS the current domain)
  if (currentDomain !== HUB_DOMAIN) {
    const hubUrl = context.city
      ? `https://${HUB_DOMAIN}/agents?city=${encodeURIComponent(context.city)}`
      : `https://${HUB_DOMAIN}/agents`;

    links.push({
      name: "ChatRealty Agent Directory",
      domain: HUB_DOMAIN,
      url: hubUrl,
      description: context.city
        ? `Find more agents in ${context.city}`
        : "Browse our full agent network",
      relevance: "network",
    });
  }

  return links.slice(0, maxLinks);
}
