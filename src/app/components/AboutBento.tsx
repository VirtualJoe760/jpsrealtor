import Link from "next/link";
import React from "react";
import { aboutSectionContent } from "@/constants/staticContent";

const AboutBento: React.FC = () => {
  return (
    <section className="bg-black py-24 sm:py-32 text-white">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        {/* Title */}
        <p className="mt-2 max-w-lg text-pretty text-xl font-medium tracking-tight text-gray-100 sm:text-5xl">
          {aboutSectionContent.title}
        </p>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          {aboutSectionContent.cards.map((card, index) => (
            <div
              key={index}
              className={`relative ${
                index === 0 || index === 1 ? "lg:col-span-3" : "lg:col-span-2"
              }`}
            >
              <div className="absolute inset-px rounded-lg lg:rounded-[2rem]" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 text-blue-300">{card.heading}</h3>
                  <p className="mt-2 text-2xl font-medium tracking-tight text-white">
                    {card.description}
                  </p>
                  <p className="mt-2 max-w-lg text-md text-gray-100 my-2">
                    {card.body}
                  </p>
                  
                  <Link
                      href={card.link.href}
                      className="text-indigo-500 hover:text-white underline"
                      aria-label={`Navigate to ${card.link.text}`}
                    >
                      {card.link.text}
                    </Link>
                  
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutBento;
