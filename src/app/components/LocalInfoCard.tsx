"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LocalInfoCardProps {
  title: string;
  description: string;
  imageUrl: string;
  link: { text: string; href: string };
  
}

const LocalInfoCard: React.FC<LocalInfoCardProps> = ({
  title,
  description,
  imageUrl,
  link,
}) => {
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const { clientX, clientY, currentTarget } = e;
    const rect = currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleMouseLeave = () => setHoverPosition(null);

  return (
    <div
      className="relative group overflow-hidden rounded-2xl bg-cover bg-center shadow-lg"
      style={{
        backgroundImage: `url(${imageUrl})`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Spotlight Effect */}
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          background: hoverPosition
            ? `radial-gradient(400px circle at ${hoverPosition.x}px ${hoverPosition.y}px, rgba(0,0,0,0.5), rgba(0,0,0,0.9))`
            : "rgba(0,0,0,0.7)",
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        <h3 className="text-sm font-semibold text-blue-300">{title}</h3>
        <p className="mt-2 text-2xl font-medium leading-tight text-white">
          {description}
        </p>
        <Link
          href={link.href}
          className="mt-6 inline-flex items-center rounded-md bg-neutral-800 px-5 py-3 text-lg font-medium text-gray-300 hover:bg-neutral-700 hover:text-white transition duration-300 ease-in-out"
          aria-label={`Navigate to ${link.text}`}
        >
          {link.text}
          <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  );
};

export default LocalInfoCard;
