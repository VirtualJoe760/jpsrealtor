"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { ClipboardCheck, Sparkles, Megaphone, Handshake, Key } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Free Home Valuation",
    description:
      "Comprehensive CMA using recent comparable sales — discover what your home is truly worth in today's market.",
  },
  {
    icon: Sparkles,
    title: "Pre-Listing Prep",
    description:
      "Staging guidance, professional photography, and cost-effective improvement recommendations to maximize buyer appeal.",
  },
  {
    icon: Megaphone,
    title: "Strategic Marketing",
    description:
      "MLS, social media, syndication to top portals, targeted ads, and our private buyer network — your home gets seen.",
  },
  {
    icon: Handshake,
    title: "Showings & Negotiation",
    description:
      "Coordinated showings, qualified-buyer screening, and expert negotiation to secure the best price and terms.",
  },
  {
    icon: Key,
    title: "Closing & Beyond",
    description:
      "Smooth escrow, inspection management, and on-time close — plus ongoing support after the sale.",
  },
];

export default function SellingJourney({ brandColor }: { brandColor: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div>
      <h2 className={`text-2xl md:text-3xl font-bold text-center mb-10 ${isLight ? "text-gray-900" : "text-white"}`}>
        Your Home-Selling Journey
      </h2>

      <div className="relative max-w-2xl mx-auto">
        <div
          className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5"
          style={{ background: `linear-gradient(to bottom, ${brandColor}, transparent)` }}
        />

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4 md:gap-6">
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: brandColor }}
                >
                  <step.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                  style={{ background: isLight ? "#1f2937" : "#fff", color: isLight ? "#fff" : "#000" }}
                >
                  {i + 1}
                </div>
              </div>

              <div className="pt-1">
                <h3 className={`text-lg font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                  {step.title}
                </h3>
                <p className={`text-sm leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
