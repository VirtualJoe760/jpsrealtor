"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, MessageCircle, LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import AISearchBar from "@/app/components/insights/AISearchBar";
import FilterTabs from "@/app/components/insights/FilterTabs";
import ArticleAccordion from "@/app/components/insights/ArticleAccordion";
import ArticleCard from "@/app/components/insights/ArticleCard";
import CategoryFilter from "@/app/components/insights/CategoryFilter";
import TopicCloud from "@/app/components/insights/TopicCloud";
import MarketStats from "@/app/components/insights/MarketStats";
import InsightsCTABanner from "@/app/components/insights/InsightsCTABanner";
import FaveSpot from "@/app/components/insights/FaveSpot";
import CommunitySpotlight from "@/app/components/insights/CommunitySpotlight";
import AgentHero from "@/app/components/insights/AgentHero";

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
  const { data: session, status } = useSession();
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
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 5;
  const [bannerImage, setBannerImage] = useState<string | undefined>(undefined);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Set initial view mode based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('list');
      } else {
        setViewMode('card');
      }
    };

    // Set initial value
    handleResize();

    // Add listener for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load all articles and agent profile on mount
  useEffect(() => {
    loadAllArticles();
    loadTopics();
    loadAgentProfile();
  }, []);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
    setCurrentPage(1); // Reset to page 1 when filters change
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

  const loadAgentProfile = async () => {
    try {
      // Use public agent API - works for all users (authenticated or not)
      const response = await fetch("/api/agent/public");
      if (response.ok) {
        const data = await response.json();
        setAgentProfile(data.profile);
        // Set banner image if available
        if (data.profile?.agentProfile?.insightsBannerImage) {
          setBannerImage(data.profile.agentProfile.insightsBannerImage);
        }
      }
    } catch (error) {
      console.error("Failed to load public agent profile:", error);
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
    router.push(`/chap?chat=${encodeURIComponent(searchQuery)}`);
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

  // Pagination calculations
  const totalPages = Math.ceil(displayedArticles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const paginatedArticles = displayedArticles.slice(startIndex, endIndex);


  return (
    <>
      {/* Fullscreen Agent Hero Section - Show for all users */}
      {agentProfile && (
        <AgentHero agentProfile={agentProfile} />
      )}

        <div className="min-h-screen pt-12 md:pt-16 pb-6 md:pb-12 px-4">
          <div className="max-w-7xl mx-auto">

          {/* Community Spotlight - Show listings from favorite subdivision/city */}
          <CommunitySpotlight />

          {/* Favorites Spotlight - Only show for logged-in users */}
          <FaveSpot className="mb-6 md:mb-8" />

          {/* CTA Banner - Show for all users */}
          <div className="mb-6 md:mb-8">
            <InsightsCTABanner backgroundImage={bannerImage} />
          </div>

        {/* Market Stats */}
        <div className="mb-6 md:mb-8">
          <MarketStats />
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <FilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            aiSuggestionsCount={searchResults.length}
          />
        </div>

        {/* Search Bar - Below Tabs, Only Shown on AI Suggestions Tab */}
        {activeTab === "ai-suggestions" && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
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
          </div>
        )}

        {/* Tab Content */}
        <div key={activeTab} className="mb-8 animate-in fade-in duration-500">
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
        </div>

        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'card'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'bg-neutral-700 text-blue-400'
                  : isLight
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-label="Card view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'bg-neutral-700 text-blue-400'
                  : isLight
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Articles Display */}
        {viewMode === 'list' ? (
          // List View
          <div className="space-y-4">
            {paginatedArticles.length > 0 ? (
              paginatedArticles.map((article, idx) => (
                <div
                  key={article.slug}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <ArticleAccordion
                    article={article}
                    initialExpanded={idx === 0 && activeTab === "ai-suggestions"}
                    highlightTerms={
                      searchQuery ? searchQuery.split(/\s+/) : []
                    }
                  />
                </div>
              ))
            ) : (
              <div
                className={`${cardBg} ${cardBorder} border rounded-xl p-12 text-center animate-in fade-in duration-500`}
              >
                <p className={`text-lg ${textSecondary}`}>
                  No articles found matching your criteria.
                </p>
                <p className={`text-sm mt-2 ${textMuted}`}>
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Card View (Grid)
          <div>
            {paginatedArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedArticles.map((article, idx) => (
                  <div
                    key={article.slug}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <ArticleCard
                      article={article}
                      highlightTerms={
                        searchQuery ? searchQuery.split(/\s+/) : []
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`${cardBg} ${cardBorder} border rounded-xl p-12 text-center animate-in fade-in duration-500`}
              >
                <p className={`text-lg ${textSecondary}`}>
                  No articles found matching your criteria.
                </p>
                <p className={`text-sm mt-2 ${textMuted}`}>
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {displayedArticles.length > articlesPerPage && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === 1
                  ? isLight
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                    currentPage === page
                      ? isLight
                        ? "bg-blue-600 text-white"
                        : "bg-emerald-600 text-white"
                      : isLight
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === totalPages
                  ? isLight
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default InsightsPage;
