"use client";

import React, { useState } from "react";
import Image from "next/image";

interface CenterHeroProps {
  backgroundImage: string;
  heroContext?: string;
  description?: string;
  maxWidth?: string; // e.g., "max-w-4xl", "max-w-6xl"
}

const CenterHero: React.FC<CenterHeroProps> = ({
  backgroundImage,
  heroContext,
  description,
  maxWidth = "max-w-4xl",
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div className="w-full flex justify-center px-6 pt-12">
      <div className={`${maxWidth} w-full`}>
        <div
          className="relative bg-cover bg-center h-[60vh] flex justify-center items-center text-white rounded-2xl overflow-hidden shadow-2xl"
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
        </div>
      </div>
    </div>
  );
};

export default CenterHero;
