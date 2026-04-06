"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { MessageCircle, Search, BarChart3, Handshake, Key } from "lucide-react";

const STEPS = [
  { icon: MessageCircle, title: "Initial Consultation", description: "We discuss your goals, budget, timeline, and must-haves to build a personalized search strategy." },
  { icon: Search, title: "Property Search", description: "Curated listings matching your criteria — including off-market and pocket listings from local connections." },
  { icon: BarChart3, title: "Market Analysis & Offer", description: "Data-driven CMA to ensure your offer is competitive. Strategic pricing backed by real comparable sales." },
  { icon: Handshake, title: "Negotiation & Inspections", description: "Expert negotiation to protect your interests. Coordinated inspections, appraisals, and contingencies." },
  { icon: Key, title: "Closing & Beyond", description: "Smooth closing process with ongoing support. Your trusted resource long after you get the keys." },
];

export default function BuyingJourney({ brandColor }: { brandColor: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div>
      <h2 className={`text-2xl md:text-3xl font-bold text-center mb-10 ${isLight ? "text-gray-900" : "text-white"}`}>
        Your Home-Buying Journey
      </h2>

      <div className="relative max-w-2xl mx-auto">
        {/* Vertical line */}
        <div
          className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5"
          style={{ background: `linear-gradient(to bottom, ${brandColor}, transparent)` }}
        />

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4 md:gap-6">
              {/* Step number + icon */}
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

              {/* Content */}
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
