"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import AISearchBar from "@/app/components/insights/AISearchBar";
import FilterTabs from "@/app/components/insights/FilterTabs";
import ArticleAccordion from "@/app/components/insights/ArticleAccordion";
import CategoryFilter from "@/app/components/insights/CategoryFilter";
import DateFilter from "@/app/components/insights/DateFilter";
import TopicCloud from "@/app/components/insights/TopicCloud";

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
    "ai-suggestions" | "categories" | "date" | "topics"
  >("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<{
    year?: number;
    month?: number;
  }>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load all articles on mount
  useEffect(() => {
    loadAllArticles();
    loadTopics();
  }, []);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
  }, [selectedCategory, selectedTopics, dateFilter, allArticles]);

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

    // Date filter
    if (dateFilter.year) {
      filtered = filtered.filter((a) => {
        const articleDate = new Date(a.date);
        const articleYear = articleDate.getFullYear();
        if (dateFilter.month) {
          const articleMonth = articleDate.getMonth() + 1;
          return (
            articleYear === dateFilter.year && articleMonth === dateFilter.month
          );
        }
        return articleYear === dateFilter.year;
      });
    }

    setDisplayedArticles(filtered);
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setActiveTab("categories");
  };

  const handleDateFilterChange = (filter: {
    year?: number;
    month?: number;
  }) => {
    setDateFilter(filter);
    setActiveTab("date");
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

  // Get available years
  const availableYears = Array.from(
    new Set(
      allArticles.map((a) => new Date(a.date).getFullYear())
    )
  ).sort((a, b) => b - a);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <div
            className={`flex items-center justify-center gap-2 mb-4 ${textSecondary}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">
              Expert Knowledge
            </span>
          </div>
          <h1
            className={`text-4xl md:text-6xl font-bold mb-6 drop-shadow-2xl ${textPrimary}`}
          >
            Real Estate Insights
          </h1>
          <p
            className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-8 ${textSecondary}`}
          >
            Discover expert advice, market insights, and tips for buying,
            selling, and investing in Coachella Valley real estate.
          </p>

          {/* AI Search Bar */}
          <AISearchBar
            onSearch={handleSearch}
            placeholder="Ask me anything about Coachella Valley real estate..."
            suggestions={suggestions}
            isLoading={isSearching}
            initialValue={searchQuery}
          />
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8"
        >
          <div
            className={`${cardBg} ${cardBorder} border rounded-xl p-4 md:p-6 ${shadow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 md:w-8 h-6 md:h-8 text-emerald-400" />
              <Sparkles
                className={`w-5 h-5 ${
                  isLight ? "text-gray-300" : "text-gray-600"
                }`}
              />
            </div>
            <h3 className={`text-xl md:text-2xl font-bold mb-1 ${textPrimary}`}>
              {categoryCounts["market-insights"]} Insights
            </h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>
              Market trends & analysis
            </p>
          </div>

          <div
            className={`${cardBg} ${cardBorder} border rounded-xl p-4 md:p-6 ${shadow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-6 md:w-8 h-6 md:h-8 text-blue-400" />
              <Sparkles
                className={`w-5 h-5 ${
                  isLight ? "text-gray-300" : "text-gray-600"
                }`}
              />
            </div>
            <h3 className={`text-xl md:text-2xl font-bold mb-1 ${textPrimary}`}>
              {categoryCounts["real-estate-tips"]} Tips
            </h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>
              Expert guides & advice
            </p>
          </div>

          <div
            className={`${cardBg} ${cardBorder} border rounded-xl p-4 md:p-6 ${shadow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-6 md:w-8 h-6 md:h-8 text-purple-400" />
              <Sparkles
                className={`w-5 h-5 ${
                  isLight ? "text-gray-300" : "text-gray-600"
                }`}
              />
            </div>
            <h3 className={`text-xl md:text-2xl font-bold mb-1 ${textPrimary}`}>
              {allArticles.length} Articles
            </h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>
              Total knowledge base
            </p>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <FilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            aiSuggestionsCount={searchResults.length}
          >
            {/* AI Suggestions Tab Content */}
            {activeTab === "ai-suggestions" && (
              <div className={`p-4 rounded-xl ${cardBg} ${cardBorder} border`}>
                {searchQuery ? (
                  <div>
                    <p className={`text-sm mb-2 ${textSecondary}`}>
                      Based on your search: <strong>&quot;{searchQuery}&quot;</strong>
                    </p>
                    <p className={`text-xs ${textMuted}`}>
                      Showing {searchResults.length} AI-ranked results
                    </p>
                  </div>
                ) : (
                  <p className={`text-sm ${textSecondary}`}>
                    Use the search bar above to get AI-powered article
                    suggestions
                  </p>
                )}
              </div>
            )}

            {/* Categories Tab Content */}
            {activeTab === "categories" && (
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                categoryCounts={categoryCounts}
              />
            )}

            {/* Date Tab Content */}
            {activeTab === "date" && (
              <DateFilter
                onFilterChange={handleDateFilterChange}
                availableYears={availableYears}
              />
            )}

            {/* Topics Tab Content */}
            {activeTab === "topics" && (
              <TopicCloud
                topics={topics}
                selectedTopics={selectedTopics}
                onTopicSelect={handleTopicSelect}
              />
            )}
          </FilterTabs>
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
