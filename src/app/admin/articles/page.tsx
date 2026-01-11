// src/app/admin/articles/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {FileText, Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Tag, TrendingUp, } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import ArticleGenerator from "@/app/components/ArticleGenerator";

type Article = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
  publishedAt: string;
  metadata: {
    views: number;
    readTime: number;
  };
  author: {
    name: string;
  };
};

export default function ArticlesAdminPage() {
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [showClaudeModal, setShowClaudeModal] = useState(false);
  const [claudePrompt, setClaudePrompt] = useState("");
  const [isLaunchingClaude, setIsLaunchingClaude] = useState(false);
  const [claudeCategory, setClaudeCategory] = useState<"articles" | "market-insights" | "real-estate-tips">("articles");
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    views: 0,
    articles: 0,
    marketInsights: 0,
    realEstateTips: 0,
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
  }, [status, page, filterCategory, filterStatus, filterYear, filterMonth]);

  // Poll for new draft articles every 30 seconds
  

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50", // Increased from 10 to show more articles
      });

      if (filterCategory !== "all") params.append("category", filterCategory);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterYear !== "all") params.append("year", filterYear);
      if (filterMonth !== "all") params.append("month", filterMonth);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/articles?${params}`);
      const data = await response.json();

      setArticles(data.articles);
      setTotalPages(data.pagination.totalPages);
      setTotalArticles(data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch all published articles
      const publishedResponse = await fetch(`/api/articles?limit=1000&status=published`);
      const publishedData = await publishedResponse.json();
      const publishedArticles = publishedData.articles;

      // Fetch all draft articles
      const draftResponse = await fetch(`/api/articles?limit=1000&status=draft`);
      const draftData = await draftResponse.json();
      const draftArticles = draftData.articles;

      // Combine all articles
      const allArticles = [...publishedArticles, ...draftArticles];

      setStats({
        total: allArticles.length,
        published: publishedArticles.length,
        draft: draftArticles.length,
        views: allArticles.reduce((sum: number, a: Article) => sum + a.metadata.views, 0),
        articles: allArticles.filter((a: Article) => a.category === "articles").length,
        marketInsights: allArticles.filter((a: Article) => a.category === "market-insights").length,
        realEstateTips: allArticles.filter((a: Article) => a.category === "real-estate-tips").length,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });
      fetchArticles();
    } catch (error) {
      console.error("Failed to delete article:", error);
    }
  };

  const handleEdit = (article: Article) => {
    // Always use slug-based route for editing
    // This works for both MongoDB articles and MDX-only articles
    router.push(`/agent/cms/edit/${article.slug}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
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
    <div className="min-h-screen py-12 px-4" data-page="admin-articles">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-16 md:pt-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-2 md:gap-3`}>
                <FileText className={`w-8 h-8 md:w-10 md:h-10 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                Articles Management
              </h1>
              <p className={textSecondary}>Manage your blog articles and content</p>
            </div>
            <div className="flex flex-row items-center gap-2 sm:gap-3">
              <ArticleGenerator onArticleGenerated={() => { fetchArticles(); fetchStats(); }} />
              <button
                onClick={() => router.push("/agent/cms/new")}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold text-sm`}
              >
                <Plus className="w-4 h-4" />
                New Article
              </button>
            </div>
          </div>
        </div>

        {/* Stats - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <FileText className={`w-8 h-8 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Total Articles</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.total}</p>
          </div>

          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 text-green-500" />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Published</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.published}</p>
          </div>

          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Edit className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Drafts</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.draft}</p>
          </div>

          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Total Views</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.views.toLocaleString()}</p>
          </div>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`${textSecondary} text-sm mb-1`}>Articles</h3>
            <p className={`text-2xl font-bold ${isLight ? "text-blue-600" : "text-blue-400"}`}>{stats.articles}</p>
            <p className={`text-xs ${textMuted} mt-1`}>Economics, trends, broader topics</p>
          </div>

          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`${textSecondary} text-sm mb-1`}>Market Insights</h3>
            <p className={`text-2xl font-bold ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>{stats.marketInsights}</p>
            <p className={`text-xs ${textMuted} mt-1`}>Coachella Valley specific</p>
          </div>

          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`${textSecondary} text-sm mb-1`}>Real Estate Tips</h3>
            <p className={`text-2xl font-bold ${isLight ? "text-purple-600" : "text-purple-400"}`}>{stats.realEstateTips}</p>
            <p className={`text-xs ${textMuted} mt-1`}>Buying/selling advice</p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6 mb-6`}>
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className={`w-full pl-10 pr-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setPage(1);
              }}
              className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
            >
              <option value="all">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setPage(1);
              }}
              className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:${isLight ? "border-blue-500" : "border-emerald-500"}`}
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            </div>

            <button
              type="submit"
              className={`w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold`}
            >
              Search
            </button>
          </form>
        </div>

        {/* Articles Table */}
        <div className={`${cardBg} ${cardBorder} rounded-xl overflow-hidden`}>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className={`${bgSecondary}/50`}>
                <tr>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Title</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Category</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Status</th>
                  <th className={`text-center text-sm font-semibold ${textSecondary} px-6 py-4`}>Views</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Published</th>
                  <th className={`text-right text-sm font-semibold ${textSecondary} px-6 py-4`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article._id}
                    className={`border-t ${border} ${cardHover} transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className={`${textPrimary} font-medium`}>{article.title}</p>
                        <p className={`text-sm ${textSecondary} mt-1 line-clamp-1`}>{article.excerpt}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${textSecondary} capitalize`}>
                        {article.category.replace("-", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          article.status === "published"
                            ? "bg-blue-500/20 text-blue-400"
                            : article.status === "draft"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`${textPrimary} font-semibold`}>{article.metadata.views}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${textSecondary}`}>
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/articles/${article.category}/${article.slug}`)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"}`}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(article)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-blue-600" : "hover:bg-gray-700 hover:text-blue-400"}`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(article._id)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-red-600" : "hover:bg-gray-700 hover:text-red-400"}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-700">
            {articles.map((article) => (
              <div key={article._id} className={`p-4 ${cardHover} transition-colors`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`${textPrimary} font-semibold text-base mb-1 line-clamp-2`}>
                      {article.title}
                    </h3>
                    <p className={`text-sm ${textSecondary} mb-2 line-clamp-2`}>
                      {article.excerpt}
                    </p>
                  </div>
                  <span
                    className={`ml-3 flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${
                      article.status === "published"
                        ? "bg-blue-500/20 text-blue-400"
                        : article.status === "draft"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {article.status}
                  </span>
                </div>

                <div className={`flex items-center gap-4 text-xs ${textMuted} mb-3`}>
                  <span className="capitalize">{article.category.replace("-", " ")}</span>
                  <span>•</span>
                  <span>{article.metadata.views} views</span>
                  <span>•</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/articles/${article.category}/${article.slug}`)}
                    className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(article)}
                    className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-blue-600" : "hover:bg-gray-700 hover:text-blue-400"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(article._id)}
                    className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-red-600" : "hover:bg-gray-700 hover:text-red-400"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {articles.length === 0 && (
            <div className={`text-center py-12 ${textSecondary}`}>
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No articles found</p>
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
