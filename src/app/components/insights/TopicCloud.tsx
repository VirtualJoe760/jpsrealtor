"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

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
  const [showAll, setShowAll] = useState(false);
  const { bgSecondary, border, textPrimary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Sort topics by count (most popular first)
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);

  // Limit topics shown
  const displayedTopics = showAll ? sortedTopics : sortedTopics.slice(0, maxTopics);

  // Calculate font size based on frequency
  const getTopicSize = (count: number) => {
    const maxCount = Math.max(...topics.map((t) => t.count));
    const minCount = Math.min(...topics.map((t) => t.count));
    const range = maxCount - minCount || 1;
    const normalized = (count - minCount) / range;

    // Scale from text-sm to text-2xl
    if (normalized > 0.8) return "text-xl md:text-2xl";
    if (normalized > 0.6) return "text-lg md:text-xl";
    if (normalized > 0.4) return "text-base md:text-lg";
    if (normalized > 0.2) return "text-sm md:text-base";
    return "text-xs md:text-sm";
  };

  // Get color based on category
  const getTopicColor = (topic: Topic, isSelected: boolean) => {
    if (isSelected) {
      return isLight
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "bg-emerald-600 text-white hover:bg-emerald-700";
    }

    if (!topic.category) {
      return isLight
        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
        : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50";
    }

    switch (topic.category) {
      case "location":
        return isLight
          ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
          : "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50";
      case "audience":
        return isLight
          ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
          : "bg-orange-900/30 text-orange-400 hover:bg-orange-900/50";
      default:
        return isLight
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
          : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50";
    }
  };

  return (
    <div className="space-y-4">
      {/* Topic Cloud */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        {displayedTopics.map((topic, idx) => {
          const isSelected = selectedTopics.includes(topic.name);
          const sizeClass = getTopicSize(topic.count);
          const colorClass = getTopicColor(topic, isSelected);

          return (
            <motion.button
              key={topic.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02, duration: 0.2 }}
              onClick={() => onTopicSelect(topic.name)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-all ${sizeClass} ${colorClass}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {topic.name}
              <span className="ml-1.5 opacity-70 text-xs">({topic.count})</span>
            </motion.button>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {topics.length > maxTopics && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className={`text-sm font-semibold transition-colors ${
              isLight
                ? "text-blue-600 hover:text-blue-700"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            {showAll ? "Show Less" : `Show All (${topics.length} topics)`}
          </button>
        </div>
      )}

      {/* Selected Topics */}
      {selectedTopics.length > 0 && (
        <div className={`p-4 rounded-lg ${bgSecondary} ${border} border`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold ${textPrimary}`}>
              Selected Topics ({selectedTopics.length})
            </p>
            <button
              onClick={() => selectedTopics.forEach((t) => onTopicSelect(t))}
              className={`text-xs font-medium transition-colors ${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTopics.map((topicName) => {
              const topic = topics.find((t) => t.name === topicName);
              if (!topic) return null;

              return (
                <span
                  key={topicName}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isLight
                      ? "bg-blue-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {topicName} ({topic.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={`p-3 rounded-lg ${bgSecondary} ${border} border`}>
        <p className={`text-xs font-semibold mb-2 ${textPrimary}`}>
          Topic Categories:
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full ${
                isLight ? "bg-purple-100" : "bg-purple-900/30"
              }`}
            />
            <span className={textPrimary}>Locations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full ${
                isLight ? "bg-orange-100" : "bg-orange-900/30"
              }`}
            />
            <span className={textPrimary}>Audience</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full ${
                isLight ? "bg-blue-100" : "bg-emerald-900/30"
              }`}
            />
            <span className={textPrimary}>Topics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
