"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  FolderOpen,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface ArticleAccordionProps {
  article: {
    title: string;
    excerpt: string;
    image: string;
    category: string;
    date: string;
    slug: string;
    topics?: string[];
  };
  initialExpanded?: boolean;
  highlightTerms?: string[];
}

export default function ArticleAccordion({
  article,
  initialExpanded = false,
  highlightTerms = [],
}: ArticleAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
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
    <motion.div
      layout
      className={`${cardBg} ${cardBorder} border rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? "shadow-xl" : "shadow-md hover:shadow-lg"
      }`}
    >
      {/* Collapsed/Header View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 md:p-6 flex gap-4 items-start text-left transition-colors"
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 96px, 128px"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`text-lg md:text-xl font-bold mb-2 ${textPrimary} line-clamp-2`}
          >
            {highlightText(article.title)}
          </h3>

          {/* Excerpt (collapsed) */}
          {!isExpanded && (
            <p className={`text-sm ${textSecondary} line-clamp-2 mb-3`}>
              {highlightText(article.excerpt)}
            </p>
          )}

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

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronUp
              className={`w-6 h-6 ${
                isLight ? "text-blue-500" : "text-emerald-400"
              }`}
            />
          ) : (
            <ChevronDown
              className={`w-6 h-6 ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={`px-4 md:px-6 pb-6 pt-2 ${cardBorder} border-t`}>
              {/* Full Excerpt */}
              <p className={`text-sm md:text-base ${textSecondary} mb-4 leading-relaxed`}>
                {highlightText(article.excerpt)}
              </p>

              {/* Topics/Tags */}
              {article.topics && article.topics.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className={`w-4 h-4 ${textMuted}`} />
                    <span className={`text-xs font-semibold ${textMuted}`}>
                      Topics:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isLight
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-900/30 text-emerald-400"
                        }`}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Read Full Article Button */}
              <Link
                href={`/insights/${article.category}/${article.slug}`}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                Read Full Article
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
