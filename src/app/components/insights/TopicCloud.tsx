"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { Search, X } from "lucide-react";

interface Topic {
  name: string;
  count: number;
  category?: "location" | "topic" | "audience";
}

interface TopicCloudProps {
  topics: Topic[];
  selectedTopics?: string[];
  onTopicSelect: (topic: string) => void;
  maxTopics?: number;
}

export default function TopicCloud({
  topics,
  selectedTopics = [],
  onTopicSelect,
  maxTopics = 30,
}: TopicCloudProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [mobileCurrentPage, setMobileCurrentPage] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { textPrimary, textSecondary, cardBg, cardBorder, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort topics by count (most popular first)
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);

  // Filter topics based on search
  const filteredTopics = searchQuery
    ? sortedTopics.filter((topic) =>
        topic.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedTopics;

  // Mobile pagination (10 per page)
  const mobilePerPage = 10;
  const mobileTotalPages = Math.ceil(filteredTopics.length / mobilePerPage);
  const mobileStartIndex = mobileCurrentPage * mobilePerPage;
  const mobileEndIndex = mobileStartIndex + mobilePerPage;
  const mobileDisplayedTopics = filteredTopics.slice(mobileStartIndex, mobileEndIndex);

  // Desktop pagination (30 per page)
  const totalPages = Math.ceil(filteredTopics.length / maxTopics);
  const startIndex = currentPage * maxTopics;
  const endIndex = startIndex + maxTopics;
  const displayedTopics = filteredTopics.slice(startIndex, endIndex);

  // Reset pagination when search changes
  useEffect(() => {
    setMobileCurrentPage(0);
    setCurrentPage(0);
  }, [searchQuery]);

  // Swipe handlers for mobile pagination
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && mobileCurrentPage < mobileTotalPages - 1) {
      setMobileCurrentPage((prev) => prev + 1);
    }

    if (isRightSwipe && mobileCurrentPage > 0) {
      setMobileCurrentPage((prev) => prev - 1);
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
      setAnimationKey((prev) => prev + 1); // Trigger re-animation
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setAnimationKey((prev) => prev + 1); // Trigger re-animation
    }
  };

  // Calculate size based on frequency with more dramatic scaling
  const getTopicSize = (count: number) => {
    const maxCount = Math.max(...topics.map((t) => t.count));
    const minCount = Math.min(...topics.map((t) => t.count));
    const range = maxCount - minCount || 1;
    const normalized = (count - minCount) / range;

    // More dramatic size differences - optimized for mobile
    if (normalized > 0.8) return { text: "text-lg md:text-2xl", padding: "px-4 md:px-6 py-2 md:py-3" };
    if (normalized > 0.6) return { text: "text-base md:text-xl", padding: "px-3.5 md:px-5 py-1.5 md:py-2.5" };
    if (normalized > 0.4) return { text: "text-sm md:text-lg", padding: "px-3 md:px-4 py-1.5 md:py-2" };
    if (normalized > 0.2) return { text: "text-xs md:text-base", padding: "px-2.5 md:px-3 py-1 md:py-1.5" };
    return { text: "text-xs md:text-sm", padding: "px-2.5 md:px-3 py-1 md:py-1.5" };
  };

  // Get color based on category with gradient effects
  const getTopicColor = (topic: Topic, isSelected: boolean) => {
    if (isSelected) {
      return isLight
        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50"
        : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/50";
    }

    if (!topic.category) {
      return isLight
        ? "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300"
        : "bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 text-emerald-400 hover:from-emerald-800/50 hover:to-emerald-700/50";
    }

    switch (topic.category) {
      case "location":
        return isLight
          ? "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 hover:from-purple-200 hover:to-purple-300"
          : "bg-gradient-to-br from-purple-900/40 to-purple-800/40 text-purple-400 hover:from-purple-800/50 hover:to-purple-700/50";
      case "audience":
        return isLight
          ? "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 hover:from-orange-200 hover:to-orange-300"
          : "bg-gradient-to-br from-orange-900/40 to-orange-800/40 text-orange-400 hover:from-orange-800/50 hover:to-orange-700/50";
      default:
        return isLight
          ? "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300"
          : "bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 text-emerald-400 hover:from-emerald-800/50 hover:to-emerald-700/50";
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      {/* MOBILE LAYOUT - Simple List */}
      <div className="md:hidden">
        {/* Search Bar */}
        <div className="mb-4">
          <div className={`relative ${cardBg} ${cardBorder} border rounded-lg overflow-hidden`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 text-sm ${cardBg} ${textPrimary} placeholder:${textSecondary} focus:outline-none`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className={`w-4 h-4 ${textSecondary}`} />
              </button>
            )}
          </div>
        </div>

        {/* Topic List */}
        <div
          className={`${cardBg} ${cardBorder} border rounded-lg overflow-hidden`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div>
            {mobileDisplayedTopics.length > 0 ? (
              mobileDisplayedTopics.map((topic, idx) => {
                const isSelected = selectedTopics.includes(topic.name);
                const categoryColor =
                  topic.category === "location"
                    ? isLight
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-purple-900/20 text-purple-400 border-purple-800/30"
                    : topic.category === "audience"
                    ? isLight
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-orange-900/20 text-orange-400 border-orange-800/30"
                    : isLight
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-900/20 text-emerald-400 border-emerald-800/30";

                return (
                  <motion.button
                    key={topic.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onTopicSelect(topic.name)}
                    className={`w-full px-4 py-3 flex items-center justify-between border-b ${
                      isLight ? "border-gray-200" : "border-gray-800"
                    } last:border-b-0 transition-colors ${
                      isSelected
                        ? isLight
                          ? "bg-blue-50"
                          : "bg-emerald-900/30"
                        : "hover:bg-opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${categoryColor}`}
                      >
                        {topic.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${textSecondary}`}>
                        {topic.count} {topic.count === 1 ? "article" : "articles"}
                      </span>
                      {isSelected && (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isLight ? "bg-blue-600" : "bg-emerald-600"
                          }`}
                        >
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className={`py-12 text-center ${textSecondary}`}>
                <p className="text-sm">No topics found</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {mobileTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setMobileCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={mobileCurrentPage === 0}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mobileCurrentPage === 0
                  ? "opacity-40 cursor-not-allowed"
                  : ""
              } ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              ← Prev
            </button>

            <div className="flex items-center gap-2">
              {/* Page dots */}
              {[...Array(Math.min(5, mobileTotalPages))].map((_, idx) => {
                let pageIdx = idx;
                // If we're past page 3, shift the dots to show current page in middle
                if (mobileCurrentPage > 2 && mobileTotalPages > 5) {
                  pageIdx = mobileCurrentPage - 2 + idx;
                  if (pageIdx >= mobileTotalPages) {
                    pageIdx = mobileTotalPages - 5 + idx;
                  }
                }

                const isActive = pageIdx === mobileCurrentPage;
                return (
                  <button
                    key={pageIdx}
                    onClick={() => setMobileCurrentPage(pageIdx)}
                    className={`transition-all ${
                      isActive
                        ? isLight
                          ? "w-8 h-2 bg-blue-600 rounded-full"
                          : "w-8 h-2 bg-emerald-600 rounded-full"
                        : isLight
                        ? "w-2 h-2 bg-gray-300 rounded-full"
                        : "w-2 h-2 bg-gray-600 rounded-full"
                    }`}
                  />
                );
              })}
            </div>

            <button
              onClick={() => setMobileCurrentPage((prev) => Math.min(mobileTotalPages - 1, prev + 1))}
              disabled={mobileCurrentPage === mobileTotalPages - 1}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mobileCurrentPage === mobileTotalPages - 1
                  ? "opacity-40 cursor-not-allowed"
                  : ""
              } ${
                isLight
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              }`}
            >
              Next →
            </button>
          </div>
        )}

        {/* Results count */}
        <p className={`text-xs ${textSecondary} mt-3 text-center`}>
          Showing {mobileStartIndex + 1}-{Math.min(mobileEndIndex, filteredTopics.length)} of {filteredTopics.length} {filteredTopics.length === 1 ? "topic" : "topics"}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* DESKTOP LAYOUT - Organic Blob with Rain Animation */}
      <div className="hidden md:block">
        <div
          className={`relative h-[500px] overflow-hidden rounded-[60% 40% 70% 30% / 60% 30% 70% 40%] ${
            isLight
              ? "bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-orange-50/50"
              : "bg-gradient-to-br from-gray-900/50 via-emerald-900/20 to-purple-900/30"
          } backdrop-blur-sm border ${
            isLight ? "border-blue-200/50" : "border-emerald-800/30"
          } shadow-2xl`}
          style={{
            boxShadow: isLight
              ? "0 20px 60px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)"
              : "0 20px 60px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-2 h-2 rounded-full ${
                  isLight ? "bg-blue-300/20" : "bg-emerald-400/10"
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.5, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Topic bubbles in flexible wrap layout */}
          <div className="relative px-8 pt-8 pb-4 flex flex-wrap gap-3 justify-center items-start">
            <AnimatePresence mode="sync" key={animationKey}>
              {displayedTopics.map((topic, idx) => {
                const isSelected = selectedTopics.includes(topic.name);
                const size = getTopicSize(topic.count);
                const colorClass = getTopicColor(topic, isSelected);

                // Random horizontal offset for rain effect
                const randomX = (Math.random() - 0.5) * 100;

                return (
                  <motion.button
                    key={`${topic.name}-${animationKey}`}
                    initial={{
                      opacity: 0,
                      scale: 0.3,
                      y: -800,
                      x: randomX,
                      rotate: Math.random() * 360 - 180,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      x: 0,
                      rotate: 0,
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 15,
                      delay: idx * 0.05,
                      mass: 0.5 + (idx % 3) * 0.2,
                    }}
                    onClick={() => onTopicSelect(topic.name)}
                    className={`${size.padding} ${size.text} rounded-full font-semibold transition-all duration-300 ${colorClass} backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer whitespace-nowrap`}
                    whileHover={{
                      scale: 1.15,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.3 },
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {topic.name}
                    <span className="ml-2 opacity-70 text-xs">({topic.count})</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-4">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={prevPage}
              disabled={currentPage === 0}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                currentPage === 0 ? "opacity-40 cursor-not-allowed" : ""
              } ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              } shadow-md hover:shadow-lg disabled:hover:shadow-md`}
            >
              ← Previous
            </motion.button>

            <div
              className={`px-4 py-2 rounded-lg ${
                isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/30 text-emerald-400"
              } font-semibold`}
            >
              Page {currentPage + 1} of {totalPages}
            </div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                currentPage === totalPages - 1 ? "opacity-40 cursor-not-allowed" : ""
              } ${
                isLight
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              } shadow-md hover:shadow-lg disabled:hover:shadow-md`}
            >
              Next →
            </motion.button>
          </div>
        )}
      </div>

      {/* Selected Topics Bar */}
      {selectedTopics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-6 rounded-2xl ${
            isLight
              ? "bg-gradient-to-r from-blue-50 to-purple-50"
              : "bg-gradient-to-r from-gray-900 to-emerald-900/30"
          } border ${isLight ? "border-blue-200" : "border-emerald-800/50"} shadow-lg`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${textPrimary}`}>
              Selected Topics ({selectedTopics.length})
            </h3>
            <button
              onClick={() => selectedTopics.forEach((t) => onTopicSelect(t))}
              className={`text-sm font-medium transition-colors ${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedTopics.map((topicName) => {
              const topic = topics.find((t) => t.name === topicName);
              if (!topic) return null;

              return (
                <motion.span
                  key={topicName}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    isLight
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  } shadow-md`}
                >
                  {topicName} ({topic.count})
                  <button
                    onClick={() => onTopicSelect(topicName)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    ✕
                  </button>
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}

    </div>
  );
}
