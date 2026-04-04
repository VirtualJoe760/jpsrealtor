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
    image: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/misc/buying.jpeg",
    href: "/insights/articles/ultimate-buyers-guide-coachella-valley",
  },
  {
    title: "Seller's Guide",
    subtitle: "Maximize your home's value",
    icon: FileText,
    image: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/misc/living-room_00001_.png",
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
            className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] block"
          >
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={guide.image}
                alt={guide.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
                quality={75}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  {guide.title}
                </h3>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default InsightsCTABanner;
