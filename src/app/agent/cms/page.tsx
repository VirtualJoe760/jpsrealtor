// src/app/agent/cms/page.tsx
"use client";

// Agent CMS Dashboard - scoped to agent's own articles
// Articles are automatically filtered by authorId in /api/articles/list
// Agents can create and publish articles directly (no admin approval needed)
// Each article includes authorId and authorName in MDX frontmatter for scoping

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {FileText, Plus, Search, Eye, Edit, Trash2, TrendingUp, EyeOff, Newspaper, Lightbulb } from "lucide-react";
import Image from "next/image";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import ArticleGenerator from "@/app/components/ArticleGenerator";
import AgentNav from "@/app/components/AgentNav";

type Article = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  draft?: boolean;
  image?: string;
  keywords?: string[];
  authorId?: string; // Tracks article author for scoping
  authorName?: string; // Author display name
};

export default function AgentCMSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const {
    bgSecondary,
    textPrimary,
    textSecondary,
    textMuted,
    cardBg,
    cardBorder,
    cardHover,
    border,
    buttonPrimary,
    buttonSecondary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  // Auto-scroll carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchArticles();
      fetchStats();
    }
  }, [status, page, filterCategory, searchTerm]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);

      // Fetch articles - automatically filtered by authorId for agents
      const response = await fetch('/api/articles/list');
      const data = await response.json();

      let filteredArticles = data.articles || [];

      // Apply filters client-side
      if (filterCategory && filterCategory !== 'all') {
        filteredArticles = filteredArticles.filter((a: Article) => a.category === filterCategory);
      }

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filteredArticles = filteredArticles.filter((a: Article) =>
          a.title.toLowerCase().includes(lowerSearch) ||
          a.excerpt.toLowerCase().includes(lowerSearch)
        );
      }

      // Client-side pagination
      const total = filteredArticles.length;
      const limit = 50;
      const totalPagesCalc = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paginatedArticles = filteredArticles.slice(start, start + limit);

      setArticles(paginatedArticles);
      setTotalPages(totalPagesCalc);
      setTotalArticles(total);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch articles - automatically filtered by authorId for agents
      const response = await fetch('/api/articles/list');
      const data = await response.json();
      const myArticles = data.articles || [];

      setStats({
        total: myArticles.length,
        published: myArticles.length, // All fetched articles are published (drafts are excluded)
        draft: 0, // Drafts are not shown in the list
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("⚠️ DELETE DRAFT\n\nThis will remove your article draft.\nThis action cannot be undone.\n\nAre you sure?")) return;

    try {
      // TODO: Only allow deleting own articles
      const response = await fetch(`/api/articles/unpublish?slugId=${slug}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert("Article deleted!");
        fetchArticles();
      } else {
        alert(`Failed to delete:\n\n${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to delete article:", error);
      alert("Network error while deleting article");
    }
  };

  const handleSubmitForReview = async (slug: string) => {
    // TODO: Implement submit for review workflow
    alert("Submit for Review feature coming soon!\n\nThis will send your article to an admin for approval before publishing.");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isLight ? "border-blue-500" : "border-emerald-500"} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={textSecondary}>Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-page="agent-cms">
      <div className="max-w-7xl mx-auto">
        <AgentNav />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary} flex items-center space-between`}>
              <FileText className={`w-8 h-8 md:w-10 md:h-10 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
              My Articles
            </h1>
            <button
              onClick={() => router.push("/admin/cms/new")}
              className={`p-2 rounded-lg transition-colors ${isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"}`}
              aria-label="New Article"
            >
              <Plus className={`w-10 h-10 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
            </button>
          </div>
          <p className={`${textSecondary} mt-2`}>Create and manage your content</p>
        </div>

        {/* Stats Carousel - Agent-specific stats */}
        <div className="mb-8">
          <div className="py-6">
            {/* Stat Display - Centered */}
            <div className="flex items-center justify-center gap-6">
              {currentStatIndex === 0 && (
                <>
                  <FileText className={`w-12 h-12 flex-shrink-0 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                  <h3 className={`${textSecondary} text-xl font-medium whitespace-nowrap`}>My Total Articles</h3>
                  <p className={`text-5xl font-bold ${textPrimary}`}>{stats.total}</p>
                </>
              )}
              {currentStatIndex === 1 && (
                <>
                  <Eye className="w-12 h-12 flex-shrink-0 text-green-500" />
                  <h3 className={`${textSecondary} text-xl font-medium whitespace-nowrap`}>Published & Live</h3>
                  <p className={`text-5xl font-bold ${textPrimary}`}>{stats.published}</p>
                </>
              )}
              {currentStatIndex === 2 && (
                <>
                  <Edit className="w-12 h-12 flex-shrink-0 text-yellow-500" />
                  <h3 className={`${textSecondary} text-xl font-medium whitespace-nowrap`}>Draft Articles</h3>
                  <p className={`text-5xl font-bold ${textPrimary}`}>{stats.draft}</p>
                </>
              )}
            </div>

            {/* Indicator Dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStatIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentStatIndex === index
                      ? isLight ? "bg-blue-500 w-8" : "bg-blue-400 w-8"
                      : isLight ? "bg-gray-300 w-2" : "bg-gray-600 w-2"
                  }`}
                  aria-label={`Go to stat ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search my articles..."
                  className={`w-full pl-10 pr-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
                />
              </div>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
            >
              <option value="all">All Categories</option>
              <option value="articles">Articles</option>
              <option value="market-insights">Market Insights</option>
              <option value="real-estate-tips">Real Estate Tips</option>
            </select>
          </div>
        </div>

        {/* Articles List - Similar to admin but with different actions */}
        <div>
          {/* Mobile/Desktop Responsive List */}
          <div>
            {articles.map((article, index) => (
              <div key={article.slug}>
                {index > 0 && <hr className={`${border}`} />}
                <div className={`py-4 px-4 ${isLight ? "bg-white/40 backdrop-blur-sm" : "bg-gray-900/40 backdrop-blur-sm"}`}>
                  <div className="flex gap-3 mb-3">
                    {/* Thumbnail */}
                    {article.image && (
                      <div className="flex-shrink-0">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={article.image}
                            alt={article.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                            quality={100}
                            unoptimized={true}
                          />
                        </div>
                      </div>
                    )}
                    {/* Title and Excerpt */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`${textPrimary} font-semibold text-base mb-1 line-clamp-2`}>
                        {article.title}
                      </h3>
                      <p className={`text-sm ${textSecondary} line-clamp-2`}>
                        {article.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 text-xs ${textMuted} mb-3`}>
                    <span className="capitalize">{article.category.replace("-", " ")}</span>
                    <span>•</span>
                    <span>{article.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/insights/${article.category}/${article.slug}`)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"
                      } text-sm flex items-center justify-center gap-2`}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/admin/cms/edit/${article.slug}`)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-emerald-600" : "hover:bg-gray-700 hover:text-emerald-400"
                      } text-sm flex items-center justify-center gap-2`}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(article.slug)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-red-600" : "hover:bg-gray-700 hover:text-red-400"
                      } text-sm flex items-center justify-center gap-2`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {articles.length === 0 && (
            <div className={`text-center py-12 ${textSecondary}`}>
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No articles found</p>
              <p className="text-sm mt-2">Create your first article to get started!</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 ${textPrimary} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "bg-gray-200 hover:bg-gray-300 border border-gray-300" : "bg-gray-800 hover:bg-gray-700 border border-gray-700"}`}
            >
              Previous
            </button>
            <span className={`${textSecondary}`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 ${textPrimary} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "bg-gray-200 hover:bg-gray-300 border border-gray-300" : "bg-gray-800 hover:bg-gray-700 border border-gray-700"}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
