"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface InsightsCTABannerProps {
  backgroundImage?: string;
}

const InsightsCTABanner: React.FC<InsightsCTABannerProps> = ({
  backgroundImage = "/images/default-insights-banner.jpg",
}) => {
  const router = useRouter();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div
      className="relative bg-cover bg-center h-[60vh] sm:h-[50vh] md:h-[55vh] flex justify-center text-white mx-auto w-full rounded-2xl overflow-hidden shadow-2xl"
      aria-label="Call to action banner for free guides"
    >
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt="Insights banner background"
        fill
        priority
        placeholder="blur"
        blurDataURL="/low-quality-placeholder.jpg"
        className={`absolute inset-0 object-cover transition-opacity duration-700 ${
          isImageLoaded ? "opacity-100" : "opacity-50 blur-md"
        }`}
        onLoad={() => setIsImageLoaded(true)}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 sm:bg-gradient-to-r sm:from-black/60 sm:via-black/40 sm:to-black/60"></div>

      {/* Content */}
      <div className="relative z-10 px-6 sm:px-8 md:px-12 flex flex-col justify-center items-center text-center h-full max-w-5xl w-full">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 drop-shadow-2xl leading-tight">
          Get Expert Insights
        </h2>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 drop-shadow-lg opacity-90 max-w-2xl px-4">
          Download our comprehensive guides to help you navigate the Coachella Valley real estate market.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col w-full sm:flex-row gap-3 sm:gap-4 max-w-md sm:max-w-none px-4 sm:px-0">
          <button
            onClick={() => router.push("/guides/buyers-guide")}
            className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all transform hover:scale-105 active:scale-95 ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl"
            }`}
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            Buyer&apos;s Guide
          </button>

          <button
            onClick={() => router.push("/guides/sellers-guide")}
            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border-2 border-white/50 rounded-xl font-semibold text-base sm:text-lg transition-all transform hover:scale-105 active:scale-95 shadow-xl"
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            Seller&apos;s Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsCTABanner;
