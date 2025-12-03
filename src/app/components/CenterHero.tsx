"use client";

import React, { useState } from "react";
import Image from "next/image";

interface CenterHeroProps {
  backgroundImage: string;
  heroContext?: string;
  description?: string;
  maxWidth?: string; // e.g., "max-w-4xl", "max-w-6xl"
  showBusinessCard?: boolean; // Show contact info like a business card
}

const CenterHero: React.FC<CenterHeroProps> = ({
  backgroundImage,
  heroContext,
  description,
  maxWidth = "max-w-4xl",
  showBusinessCard = false,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div className="w-full flex justify-center px-6">
      <div className={`${maxWidth} w-full`}>
        <div
          className="relative bg-cover bg-center h-[60vh] flex justify-center items-center text-white rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10"
          aria-label={`Background hero image for ${heroContext || "hero section"}`}
        >
          {/* Optimized Background Image with Blur Effect */}
          <Image
            src={backgroundImage}
            alt={`Hero image for ${heroContext || "hero section"}`}
            fill
            priority
            placeholder="blur"
            blurDataURL="/low-quality-placeholder.jpg"
            className={`absolute inset-0 object-cover transition-opacity duration-700 ${
              isImageLoaded ? "opacity-100" : "opacity-50 blur-md"
            }`}
            onLoadingComplete={() => setIsImageLoaded(true)}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black opacity-30"></div>

          {/* Content */}
          {showBusinessCard ? (
            // Business Card Style - Bottom Left
            <div className="relative z-10 px-8 pb-8 flex flex-col justify-end items-start h-full w-full">
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-2xl max-w-md">
                <h2 className="text-2xl font-bold mb-2 drop-shadow-lg">
                  Joseph Sardella
                </h2>
                <p className="text-lg mb-3 drop-shadow-md">
                  Real Estate Agent
                </p>
                <div className="space-y-1 text-sm drop-shadow-md">
                  <p>DRE# 02106916</p>
                  <p>760-333-2674</p>
                  <p>josephsardella@gmail.com</p>
                </div>
              </div>
            </div>
          ) : (
            // Original Center Style
            <div className="relative z-10 px-4 flex flex-col justify-center items-center text-center h-full">
              <h1 className="text-5xl font-bold sm:text-6xl lg:text-7xl drop-shadow-2xl">
                {heroContext || "Hero Section"}
              </h1>
              {description && (
                <p className="mt-4 pt-2 text-2xl sm:text-3xl lg:text-4xl drop-shadow-lg">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterHero;
