// src/app/admin/articles/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {FileText, Plus, Search, Eye, Edit, Trash2, TrendingUp, EyeOff } from "lucide-react";
import Image from "next/image";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import ArticleGenerator from "@/app/components/ArticleGenerator";
import AdminNav from "@/app/components/AdminNav";

type Article = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  draft?: boolean;
  image?: string;
  keywords?: string[];
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
  }, [status, page, filterCategory, searchTerm]);

  // Poll for new draft articles every 30 seconds
  

  const fetchArticles = async () => {
    try {
      setIsLoading(true);

      // Fetch from MDX files (source of truth)
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
      // Fetch all articles from MDX files (source of truth)
      const response = await fetch('/api/articles/list');
      const data = await response.json();
      const allArticles = data.articles || [];

      setStats({
        total: allArticles.length,
        published: allArticles.length, // All MDX files are published
        draft: 0, // Drafts are filtered out by /api/articles/list
        views: 0, // MDX files don't track views
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

  const handleUnpublish = async (slug: string) => {
    if (!confirm("This will remove the article from the website. Are you sure?")) return;

    try {
      const response = await fetch(`/api/articles/unpublish?slugId=${slug}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert(`Article unpublished successfully!\n\nThe MDX file has been removed from src/posts/`);
        fetchArticles();
      } else {
        alert(`Failed to unpublish:\n\n${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to unpublish article:", error);
      alert("Network error while unpublishing article");
    }
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
        <AdminNav />

        {/* Header */}
        <div className="mb-8">
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
                onClick={() => router.push("/admin/cms/new")}
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
                  placeholder="Search articles..."
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

        {/* Articles Table */}
        <div className={`${cardBg} ${cardBorder} rounded-xl overflow-hidden`}>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className={`${bgSecondary}/50`}>
                <tr>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Article</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Category</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Date</th>
                  <th className={`text-right text-sm font-semibold ${textSecondary} px-6 py-4`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.slug}
                    className={`border-t ${border} ${cardHover} transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex gap-4 items-center">
                        {/* Thumbnail */}
                        {article.image && (
                          <div className="flex-shrink-0">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                              <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                                quality={100}
                                unoptimized={true}
                              />
                            </div>
                          </div>
                        )}
                        {/* Title and Excerpt */}
                        <div className="flex-1 min-w-0">
                          <p className={`${textPrimary} font-medium`}>{article.title}</p>
                          <p className={`text-sm ${textSecondary} mt-1 line-clamp-1`}>{article.excerpt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${textSecondary} capitalize`}>
                        {article.category.replace("-", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${textSecondary}`}>
                        {article.date}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/insights/${article.category}/${article.slug}`)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"}`}
                          title="View on Website"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/cms/edit/${article.slug}`)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-emerald-600" : "hover:bg-gray-700 hover:text-emerald-400"}`}
                          title="Edit Article"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUnpublish(article.slug)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-orange-600" : "hover:bg-gray-700 hover:text-orange-400"}`}
                          title="Unpublish from Website"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUnpublish(article.slug)}
                          className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? "hover:bg-gray-100 hover:text-red-600" : "hover:bg-gray-700 hover:text-red-400"}`}
                          title="Delete from Database"
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
              <div key={article.slug} className={`p-4 ${cardHover} transition-colors`}>
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
                    onClick={() => handleUnpublish(article.slug)}
                    className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-orange-600" : "hover:bg-gray-700 hover:text-orange-400"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <EyeOff className="w-4 h-4" />
                    Unpublish
                  </button>
                  <button
                    onClick={() => handleUnpublish(article.slug)}
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
