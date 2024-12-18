"use client";

import Link from "next/link";
import React, { useState } from "react";
import { aboutSectionContent } from "@/constants/staticContent";

const AboutBento: React.FC = () => {
  return (
    <section className="bg-black py-10 sm:py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <p className="text-center text-5xl sm:text-6xl font-semibold tracking-tight mb-12">
          {aboutSectionContent.title}
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-6 lg:grid-rows-2">
          {aboutSectionContent.cards.map((card, index) => (
            <Card
              key={index}
              card={card}
              spanClass={
                index === 0 || index === 1 ? "lg:col-span-3" : "lg:col-span-2"
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface CardProps {
  card: {
    heading: string;
    description: string;
    body: string;
    link: { text: string; href: string };
    imageUrl: string;
  };
  spanClass: string;
}

const Card: React.FC<CardProps> = ({ card, spanClass }) => {
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
      className={`relative group overflow-hidden rounded-2xl ${spanClass}`}
      style={{
        backgroundImage: `url(${card.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
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
      <div className="relative p-8 sm:p-10">
        <h3 className="text-sm font-semibold text-blue-300">
          {card.heading}
        </h3>
        <p className="mt-2 text-3xl font-medium leading-tight text-white">
          {card.description}
        </p>
        <p className="mt-4 text-lg text-gray-200">{card.body}</p>

        {/* Button */}
        <Link
          href={card.link.href}
          className="mt-6 inline-flex items-center rounded-md bg-neutral-800 px-5 py-3 text-lg font-medium text-gray-300 hover:bg-neutral-700 hover:text-white transition duration-300 ease-in-out"
          aria-label={`Navigate to ${card.link.text}`}
        >
          {card.link.text}
          <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  );
};

export default AboutBento;
