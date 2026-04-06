"use client";

import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";
import { Shield, Target, Heart, Key } from "lucide-react";

const DEFAULT_ICONS = [Shield, Target, Heart, Key];

export default function AgentValueProps({ agent }: { agent: AgentProfile }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      {/* Agent card */}
      <div className="lg:col-span-2 flex flex-col items-center text-center">
        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl mb-4 border-2"
          style={{ borderColor: agent.brandColor + "40" }}
        >
          <Image src={agent.headshot} alt={agent.name} fill className="object-cover" />
        </div>
        <h3 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
          {agent.name}
        </h3>
        <p className={`text-sm mb-3 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          {agent.brokerageName} · DRE# {agent.licenseNumber}
        </p>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {agent.specializations.map((s, i) => (
            <span
              key={i}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                isLight ? "bg-gray-100 text-gray-700" : "bg-white/10 text-gray-300"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Value propositions */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
          Why Work With {agent.name.split(" ")[0]}
        </h2>
        <p className={`text-sm leading-relaxed mb-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
          {agent.bio}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agent.valuePropositions.map((vp, i) => {
            const Icon = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
            return (
              <div
                key={i}
                className={`rounded-xl p-4 border transition-all hover:scale-[1.02] ${
                  isLight
                    ? "bg-white border-gray-200 hover:shadow-md"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: agent.brandColor + "20" }}
                >
                  <Icon className="w-5 h-5" style={{ color: agent.brandColor }} />
                </div>
                <h4 className={`text-sm font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                  {vp.title}
                </h4>
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                  {vp.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
