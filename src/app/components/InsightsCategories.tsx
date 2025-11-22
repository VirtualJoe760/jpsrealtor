"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { insightsCategoriesContent } from "@/constants/staticContent"; // Import static content
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const InsightsCategories = () => {
  const { textPrimary, textSecondary } = useThemeClasses();

  return (
    <div className="py-24 sm:py-32" aria-labelledby="tips-categories-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Dynamic heading and description */}
          <h2 id="tips-categories-heading" className={`text-3xl font-bold tracking-tight pb-3 sm:text-4xl ${textPrimary}`}>
            {insightsCategoriesContent.heading}
          </h2>
          <p className={`mt-2 text-lg leading-8 ${textSecondary}`}>
            {insightsCategoriesContent.description}
          </p>
        </div>

        {/* Categories */}
        <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {insightsCategoriesContent.categories.map((category) => (
            <article
              key={category.id}
              className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-8 pb-8 pt-80 sm:pt-48 lg:pt-80"
              aria-labelledby={`category-${category.id}-heading`}
            >
              {/* Dynamic Image with lazy loading */}
              <Image
                width={378}
                height={412}
                alt={category.altText}
                src={category.imageUrl}
                className="absolute inset-0 -z-10 h-full w-full object-cover"
                loading="lazy" // Enable lazy loading for the images
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40" />
              <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-gray-900/10" />

              <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm text-gray-300">
              </div>

              {/* Dynamic title and link */}
              <h3 id={`category-${category.id}-heading`} className="mt-3 text-3xl text-white">
                <Link href={category.href} aria-label={`Read more about ${category.title}`}>
                  <span className="absolute inset-0" />
                  {category.title}
                </Link>
              </h3>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsCategories;
