"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";

interface AgentProfile {
  name: string;
  email: string;
  phone: string;
  website?: string;
  agentProfile?: {
    headshot?: string;
    profilePhoto?: string;
    brokerageName?: string;
    licenseNumber?: string;
    teamLogo?: string;
    brokerLogo?: string;
    brokerLogoDark?: string;
    customDomain?: string;
    subdomain?: string;
  };
}

export default function LandingPageFooter() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [agent, setAgent] = useState<AgentProfile | null>(null);

  useEffect(() => {
    // Detect subdomain to load the correct agent's profile
    const host = window.location.hostname;
    let subParam = "";
    if (host.includes("chatrealty")) {
      const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
      const sub = parts?.split(".").filter((s: string) => s && s !== "www").pop();
      if (sub) subParam = `?subdomain=${sub}`;
    } else if (host.endsWith(".localhost")) {
      const sub = host.split(".localhost")[0];
      if (sub && sub !== "www") subParam = `?subdomain=${sub}`;
    }
    fetch(`/api/agent/public${subParam}`)
      .then((res) => res.json())
      .then((data) => setAgent(data.profile))
      .catch(() => {});
  }, []);

  if (!agent) return null;

  const headshot = agent.agentProfile?.headshot || agent.agentProfile?.profilePhoto;
  // Use agent's broker logo if available, fall back to platform eXp logo
  const logo = isLight
    ? (agent.agentProfile?.brokerLogo || "/images/brand/exp-Realty-Logo-black.png")
    : (agent.agentProfile?.brokerLogoDark || agent.agentProfile?.brokerLogo || "/images/brand/EXP-white-square.png");
  const agentWebsite = agent.agentProfile?.customDomain
    || (agent.agentProfile?.subdomain ? `${agent.agentProfile.subdomain}.chatrealty.io` : null)
    || agent.website
    || "chatrealty.io";

  return (
    <footer className="px-4">
      <div className="max-w-4xl mx-auto flex items-end gap-4 md:gap-8">
        {/* Headshot — left, flush to page bottom */}
        {headshot && (
          <div className="relative w-36 h-52 md:w-48 md:h-72 flex-shrink-0">
            <Image
              src={headshot}
              alt={agent.name}
              fill
              className="object-contain object-bottom"
              sizes="(max-width: 768px) 144px, 192px"
            />
          </div>
        )}

        {/* Contact info — center */}
        <div className="flex-1 text-center pb-8">
          <p className={`text-xl md:text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            {agent.name}
          </p>
          {agent.agentProfile?.brokerageName && (
            <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              {agent.agentProfile.brokerageName}
            </p>
          )}
          {agent.agentProfile?.licenseNumber && (
            <p className={`text-xs mt-0.5 text-gray-500`}>
              DRE# {agent.agentProfile.licenseNumber}
            </p>
          )}
          <div className={`mt-3 text-sm space-y-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            {agent.phone && (
              <p>
                <a href={`tel:${agent.phone}`} className="hover:underline">{agent.phone}</a>
              </p>
            )}
            {agent.email && (
              <p>
                <a href={`mailto:${agent.email}`} className="hover:underline">{agent.email}</a>
              </p>
            )}
            <p>
              <a
                href={`https://${agentWebsite}`}
                className={`hover:underline font-medium ${isLight ? "text-gray-700" : "text-gray-300"}`}
              >
                {agentWebsite}
              </a>
            </p>
          </div>
        </div>

        {/* eXp Realty logo — right */}
        <div className="relative flex-shrink-0 w-20 h-20 md:w-28 md:h-28 mb-8">
          <Image
            src={logo}
            alt="eXp Realty"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 80px, 112px"
          />
        </div>
      </div>
    </footer>
  );
}
