"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone, Calendar, Instagram, Facebook, Youtube } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";

export default function ContactCTA({ agent, cityName }: { agent: AgentProfile; cityName: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className={`rounded-2xl overflow-hidden ${
      isLight ? "bg-gray-900" : "bg-white/5 border border-white/10"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Agent image */}
        <div className="relative h-64 md:h-auto min-h-[300px]">
          <Image
            src={agent.headshot}
            alt={agent.name}
            fill
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-gray-900/80" />
        </div>

        {/* Content */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Ready to find your home in {cityName}?
          </h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {agent.name.split(" ")[0]} is ready to help you navigate the {cityName} market.
            From first showing to closing day — get expert guidance every step of the way.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <a
              href={`tel:${agent.phone.replace(/\D/g, "")}`}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})` }}
            >
              <Phone className="w-5 h-5" />
              {agent.phone}
            </a>
            <Link
              href="/book-appointment"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              Book Consultation
            </Link>
          </div>

          {/* Social links */}
          <div className="flex gap-3">
            {agent.socialMedia.instagram && (
              <a href={agent.socialMedia.instagram} target="_blank" rel="noopener" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {agent.socialMedia.facebook && (
              <a href={agent.socialMedia.facebook} target="_blank" rel="noopener" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {agent.socialMedia.youtube && (
              <a href={agent.socialMedia.youtube} target="_blank" rel="noopener" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
