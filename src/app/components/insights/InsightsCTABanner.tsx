"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, FileText } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const guides = [
  {
    title: "Buyer's Guide",
    subtitle: "Navigate the Coachella Valley market",
    icon: BookOpen,
    image: "/misc/buying.jpeg",
    href: "/insights/articles/ultimate-buyers-guide-coachella-valley",
  },
  {
    title: "Seller's Guide",
    subtitle: "Maximize your home's value",
    icon: FileText,
    image: "/misc/living-room_00001_.png",
    href: "/insights/articles/ultimate-sellers-guide-coachella-valley",
  },
];

interface InsightsCTABannerProps {
  backgroundImage?: string;
}

const InsightsCTABanner: React.FC<InsightsCTABannerProps> = () => {
  const { currentTheme, cardBg, cardBorder, textPrimary, textSecondary, shadow } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
      {guides.map((guide) => {
        const Icon = guide.icon;
        return (
          <Link
            key={guide.title}
            href={guide.href}
            className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] block ${cardBg} ${cardBorder} ${shadow}`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={guide.image}
                alt={guide.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className={`p-2 rounded-lg backdrop-blur-sm ${
                  isLight ? "bg-blue-600" : "bg-emerald-600"
                }`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white drop-shadow-lg">
                  {guide.title}
                </h3>
              </div>
            </div>

            {/* Text */}
            <div className="p-4">
              <p className={`text-sm ${textSecondary}`}>
                {guide.subtitle}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default InsightsCTABanner;
