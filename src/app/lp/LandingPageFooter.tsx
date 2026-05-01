"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";

interface AgentProfile {
  name: string;
  email: string;
  phone: string;
  agentProfile?: {
    headshot?: string;
    profilePhoto?: string;
    brokerageName?: string;
    licenseNumber?: string;
    teamLogo?: string;
    brokerLogo?: string;
  };
}

export default function LandingPageFooter() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [agent, setAgent] = useState<AgentProfile | null>(null);

  useEffect(() => {
    fetch("/api/agent/public")
      .then((res) => res.json())
      .then((data) => setAgent(data.profile))
      .catch(() => {});
  }, []);

  if (!agent) return null;

  const headshot = agent.agentProfile?.headshot || agent.agentProfile?.profilePhoto;
  // Platform-level eXp logo — all agents are under one team
  const logo = isLight ? "/images/brand/exp-Realty-Logo-black.png" : "/images/brand/EXP-white-square.png";

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
                href="https://jpsrealtor.com"
                className={`hover:underline font-medium ${isLight ? "text-gray-700" : "text-gray-300"}`}
              >
                jpsrealtor.com
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
