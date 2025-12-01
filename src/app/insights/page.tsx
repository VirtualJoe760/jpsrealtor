"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import AISearchBar from "@/app/components/insights/AISearchBar";
import FilterTabs from "@/app/components/insights/FilterTabs";
import ArticleAccordion from "@/app/components/insights/ArticleAccordion";
import CategoryFilter from "@/app/components/insights/CategoryFilter";
import TopicCloud from "@/app/components/insights/TopicCloud";
import MarketStats from "@/app/components/insights/MarketStats";

interface Article {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
}

interface SearchResult {
  article: Article;
  relevanceScore: number;
  matchReasons: string[];
}

interface Topic {
  name: string;
  count: number;
  category?: "location" | "topic" | "audience";
}

const InsightsPage = () => {
  const router = useRouter();
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    shadow,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // State
  const [activeTab, setActiveTab] = useState<
    "ai-suggestions" | "categories" | "topics"
  >("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load all articles on mount
  useEffect(() => {
    loadAllArticles();
    loadTopics();
  }, []);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
  }, [selectedCategory, selectedTopics, allArticles]);

  const loadAllArticles = async () => {
    try {
      const response = await fetch("/api/articles/list");
      if (response.ok) {
        const data = await response.json();
        const articles = data.articles || [];
        setAllArticles(articles);
        setDisplayedArticles(articles);
      }
    } catch (error) {
      console.error("Failed to load articles:", error);
    }
  };

  const loadTopics = async () => {
    try {
      const response = await fetch("/api/articles/topics");
      if (response.ok) {
        const data = await response.json();
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error("Failed to load topics:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    try {
      const response = await fetch("/api/articles/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 50 }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setSuggestions(data.suggestions || []);
        setDisplayedArticles(data.results.map((r: SearchResult) => r.article));
        setActiveTab("ai-suggestions");
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const filterArticles = () => {
    if (searchQuery && activeTab === "ai-suggestions") {
      // Use AI search results
      return;
    }

    let filtered = [...allArticles];

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    // Topics filter
    if (selectedTopics.length > 0) {
      filtered = filtered.filter((a) =>
        a.topics?.some((t) => selectedTopics.includes(t))
      );
    }

    setDisplayedArticles(filtered);
  };

  const handleTopicSelect = (topic: string) => {
    const newSelectedTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];

    setSelectedTopics(newSelectedTopics);

    // Automatically switch to topics tab and filter
    setActiveTab("topics");
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setActiveTab("categories");
  };

  const handleAskChat = () => {
    // Redirect to chat with the search query pre-filled
    router.push(`/?chat=${encodeURIComponent(searchQuery)}`);
  };

  // Get category counts
  const categoryCounts = {
    articles: allArticles.filter((a) => a.category === "articles").length,
    "market-insights": allArticles.filter((a) => a.category === "market-insights")
      .length,
    "real-estate-tips": allArticles.filter(
      (a) => a.category === "real-estate-tips"
    ).length,
  };

  return (
    <div className="min-h-screen pt-12 md:pt-16 pb-6 md:pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 md:mb-8 text-center"
        >
          <div
            className={`flex items-center justify-center gap-1.5 md:gap-2 mb-3 md:mb-4 ${textSecondary}`}
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm uppercase tracking-wider">
              Expert Knowledge
            </span>
          </div>
          <h1
            className={`text-3xl md:text-6xl font-bold mb-4 md:mb-6 drop-shadow-2xl ${textPrimary}`}
          >
            Real Estate Insights
          </h1>
          <p
            className={`text-base md:text-xl max-w-3xl mx-auto leading-relaxed ${textSecondary}`}
          >
            Discover expert advice, market insights, and tips for buying,
            selling, and investing in Coachella Valley real estate.
          </p>
        </motion.div>

        {/* Market Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <MarketStats />
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <FilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            aiSuggestionsCount={searchResults.length}
          />
        </motion.div>

        {/* Search Bar - Below Tabs, Only Shown on AI Suggestions Tab */}
        {activeTab === "ai-suggestions" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <AISearchBar
              onSearch={handleSearch}
              placeholder="Ask me anything about Coachella Valley real estate..."
              suggestions={suggestions}
              isLoading={isSearching}
              initialValue={searchQuery}
            />

            {/* Search Results Info */}
            {searchQuery && (
              <div className={`mt-4 p-4 rounded-xl ${cardBg} ${cardBorder} border`}>
                <p className={`text-sm mb-2 ${textSecondary}`}>
                  Based on your search:{" "}
                  <strong className={textPrimary}>&quot;{searchQuery}&quot;</strong>
                </p>
                <p className={`text-sm mb-3 ${textMuted}`}>
                  Showing {searchResults.length} AI-ranked results
                </p>
                {searchResults.length === 0 && (
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${textSecondary}`}>
                      Can&apos;t find what you want?
                    </p>
                    <button
                      onClick={handleAskChat}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        isLight
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Ask our AI Chat
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {/* Categories Tab Content */}
          {activeTab === "categories" && (
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              categoryCounts={categoryCounts}
            />
          )}

          {/* Topics Tab Content */}
          {activeTab === "topics" && (
            <TopicCloud
              topics={topics}
              selectedTopics={selectedTopics}
              onTopicSelect={handleTopicSelect}
              maxTopics={30}
            />
          )}
        </motion.div>

        {/* Articles Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-4"
        >
          {displayedArticles.length > 0 ? (
            displayedArticles.map((article, idx) => (
              <ArticleAccordion
                key={article.slug}
                article={article}
                initialExpanded={idx === 0 && activeTab === "ai-suggestions"}
                highlightTerms={
                  searchQuery ? searchQuery.split(/\s+/) : []
                }
              />
            ))
          ) : (
            <div
              className={`${cardBg} ${cardBorder} border rounded-xl p-12 text-center`}
            >
              <p className={`text-lg ${textSecondary}`}>
                No articles found matching your criteria.
              </p>
              <p className={`text-sm mt-2 ${textMuted}`}>
                Try adjusting your filters or search query.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default InsightsPage;
