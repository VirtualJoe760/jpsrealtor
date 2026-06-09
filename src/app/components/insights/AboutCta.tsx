"use client";

// Homepage banner that invites visitors to the agent's About page. Pulls name /
// headshot / teaser from the same agentProfile the homepage already has.

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function AboutCta({ agentProfile }: { agentProfile: any }) {
  const router = useRouter();
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  if (!agentProfile) return null;
  const ap = agentProfile.agentProfile || {};
  const name: string = agentProfile.name || "your agent";
  const firstName = name.split(" ")[0];
  const brand = ap.brandColor || "#2563eb";
  const headshot = ap.headshot || ap.profilePhoto;
  const teaser: string =
    ap.tagline ||
    (ap.bio ? `${ap.bio.slice(0, 130)}${ap.bio.length > 130 ? "…" : ""}` : `Get to know the agent behind your search.`);

  return (
    <section className="w-full px-0 md:px-4 my-6">
      <div className="w-full md:max-w-7xl md:mx-auto">
        <button
          onClick={() => router.push("/about")}
          className={`group w-full text-left rounded-none md:rounded-2xl border overflow-hidden transition-all hover:shadow-xl ${
            isLight ? "bg-white border-gray-200" : "bg-neutral-900/60 border-neutral-800"
          }`}
        >
          <div className="flex items-center gap-5 p-5 md:p-7">
            {headshot && (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shrink-0 shadow-md" style={{ boxShadow: `0 0 0 3px ${brand}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headshot} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: brand }}>
                Meet your agent
              </div>
              <h3 className={`text-lg md:text-2xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                {name}
              </h3>
              <p className={`text-sm md:text-base line-clamp-2 ${isLight ? "text-gray-600" : "text-gray-300"}`}>{teaser}</p>
            </div>
            <div
              className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium shrink-0 transition-transform group-hover:translate-x-1"
              style={{ backgroundColor: brand }}
            >
              About {firstName} <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
