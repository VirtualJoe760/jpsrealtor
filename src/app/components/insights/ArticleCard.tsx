"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  FolderOpen,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface ArticleCardProps {
  article: {
    title: string;
    excerpt: string;
    image: string;
    category: string;
    date: string;
    slug: string;
    topics?: string[];
  };
  highlightTerms?: string[];
}

export default function ArticleCard({
  article,
  highlightTerms = [],
}: ArticleCardProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Format date
  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format category
  const categoryDisplay =
    article.category === "market-insights"
      ? "Market Insights"
      : article.category === "real-estate-tips"
      ? "Real Estate Tips"
      : "Articles";

  // Highlight search terms in text
  const highlightText = (text: string) => {
    if (!highlightTerms.length) return text;

    let highlighted = text;
    highlightTerms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlighted = highlighted.replace(
        regex,
        `<mark class="${
          isLight
            ? "bg-yellow-200 text-gray-900"
            : "bg-yellow-500/30 text-yellow-300"
        }">$1</mark>`
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <Link href={`/insights/${article.category}/${article.slug}`}>
      <div
        className={`${cardBg} ${cardBorder} border rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer h-full flex flex-col`}
      >
        {/* Image */}
        {article.image && (
          <div className="relative w-full h-48 bg-gray-200">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={100}
              unoptimized={true}
              priority={false}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-5 flex-1 flex flex-col">
          {/* Title */}
          <h3
            className={`text-lg md:text-xl font-bold mb-2 ${textPrimary} line-clamp-2`}
          >
            {highlightText(article.title)}
          </h3>

          {/* Excerpt */}
          <p className={`text-sm ${textSecondary} line-clamp-3 mb-3 flex-1`}>
            {highlightText(article.excerpt)}
          </p>

          {/* Meta info */}
          <div
            className={`flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm ${textMuted}`}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4" />
              <span>{categoryDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
