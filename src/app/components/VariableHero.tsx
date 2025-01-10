"use client";

import React, { useState } from "react";
import Image from "next/image";

interface VariableHeroProps {
  backgroundImage: string;
  heroContext?: string;
  description?: string;
  alignment?: "left" | "center" | "right";
}

const VariableHero: React.FC<VariableHeroProps> = ({
  backgroundImage,
  heroContext,
  description,
  alignment = "center",
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Determine alignment classes
  const alignmentClass =
    alignment === "left"
      ? "text-left items-start"
      : alignment === "right"
      ? "text-right items-end"
      : "text-center items-center";

  return (
    <div
      className="relative bg-cover bg-center 2xl:px-[20%] h-[60vh] flex justify-center text-white mx-auto w-full"
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
        className={`absolute inset-0 object-cover rounded-lg transition-opacity duration-700 ${
          isImageLoaded ? "opacity-100" : "opacity-50 blur-md"
        }`}
        onLoadingComplete={() => setIsImageLoaded(true)}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-20 rounded-lg"></div>

      {/* Content */}
      <div
        className={`relative z-10 px-4 flex flex-col justify-center ${alignmentClass} h-full`}
      >
        <h1 className="text-5xl font-bold sm:text-6xl lg:text-7xl">
          {heroContext || "Hero Section"}
        </h1>
        {description && (
          <p className="mt-4 pt-2 text-2xl sm:text-3xl lg:text-4xl">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default VariableHero;
