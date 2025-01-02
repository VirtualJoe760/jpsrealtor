"use client";
import React, { useState } from "react";
import { City } from "@/constants/cities";
import Image from "next/image";

interface CityCardProps {
  city: City; // Expecting a city object as a prop
}

const CityCard: React.FC<CityCardProps> = ({ city }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div className="relative flex items-center" aria-label={`Learn more about ${city.name}`}>
      <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:w-80 lg:h-52">
        <Image
          src={`https://res.cloudinary.com/duqgao9h8/image/upload/v1733905168/${city.id}.jpg`}
          alt={`Image of ${city.name}`}
          fill
          className={`rounded-2xl object-cover transition-opacity duration-700 ${
            isImageLoaded ? "opacity-100" : "opacity-50 blur-md"
          }`}
          onLoadingComplete={() => setIsImageLoaded(true)}
          placeholder="blur"
          blurDataURL="/low-quality-placeholder.jpg" // Replace with your placeholder image path
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
      </div>
      <div className="border-l-2 border-black h-40 mx-10" /> {/* Divider */}
      <div className="flex flex-col p-4">
        <h3 className="text-6xl text-black mt-4">{city.name}</h3>
      </div>
    </div>
  );
};

export default CityCard;
