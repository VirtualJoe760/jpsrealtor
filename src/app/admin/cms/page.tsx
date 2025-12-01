// src/app/admin/articles/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {FileText, Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Tag, TrendingUp, Globe, EyeOff } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import AdminNav from "@/app/components/AdminNav";

type Article = {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
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
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    views: 0,
    articles: 0,
    marketInsights: 0,
    realEstateTips: 0,
  });
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const statIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [status, page, filterCategory]);

  // Auto-carousel for mobile stats
  useEffect(() => {
    if (isPaused) {
      if (statIntervalRef.current) {
        clearInterval(statIntervalRef.current);
        statIntervalRef.current = null;
      }
      return;
    }

    statIntervalRef.current = setInterval(() => {
      setActiveStatIndex((current) => (current + 1) % 7);
    }, 3000);

    return () => {
      if (statIntervalRef.current) {
        clearInterval(statIntervalRef.current);
      }
    };
  }, [isPaused, stats, isLight]);

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
  const fetchStats = async () => {
    try {
      // Fetch all articles from MDX files (source of truth)
      const response = await fetch('/api/articles/list');
      const data = await response.json();
      const allArticles = data.articles || [];

      setStats({
        total: allArticles.length,
        published: allArticles.length,
        draft: 0,
        views: 0,
        articles: allArticles.filter((a: Article) => a.category === "articles").length,
        marketInsights: allArticles.filter((a: Article) => a.category === "market-insights").length,
        realEstateTips: allArticles.filter((a: Article) => a.category === "real-estate-tips").length,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };
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
            <button
                onClick={() => router.push("/admin/cms/new")}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold text-sm`}
              >
                <Plus className="w-4 h-4" />
                New Article
              </button>
          </div>
        </div>

        {/* Stats - Top Row */}
                {/* Desktop Stats */}
        <div className="hidden md:grid md:grid-cols-4 gap-6 mb-6">
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

        {/* Mobile Stats Carousel */}
        <div className="md:hidden mb-6 relative h-[140px]">
          <div
            className="absolute inset-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              {activeStatIndex === 0 && (
                <motion.div
                  key="total"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <FileText className={`w-8 h-8 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                  </div>
                  <h3 className={`${textSecondary} text-sm mb-1`}>Total Articles</h3>
                  <p className={`text-3xl font-bold ${textPrimary}`}>{stats.total}</p>
                </motion.div>
              )}
              {activeStatIndex === 1 && (
                <motion.div
                  key="published"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Eye className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className={`${textSecondary} text-sm mb-1`}>Published</h3>
                  <p className={`text-3xl font-bold ${textPrimary}`}>{stats.published}</p>
                </motion.div>
              )}
              {activeStatIndex === 2 && (
                <motion.div
                  key="draft"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Edit className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h3 className={`${textSecondary} text-sm mb-1`}>Drafts</h3>
                  <p className={`text-3xl font-bold ${textPrimary}`}>{stats.draft}</p>
                </motion.div>
              )}
              {activeStatIndex === 3 && (
                <motion.div
                  key="views"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className={`${textSecondary} text-sm mb-1`}>Total Views</h3>
                  <p className={`text-3xl font-bold ${textPrimary}`}>{stats.views.toLocaleString()}</p>
                </motion.div>
              )}
              {activeStatIndex === 4 && (
                <motion.div
                  key="articles"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <h3 className={`${textSecondary} text-sm mb-1`}>Articles</h3>
                  <p className={`text-3xl font-bold ${isLight ? "text-blue-600" : "text-blue-400"}`}>{stats.articles}</p>
                  <p className={`text-xs ${textMuted} mt-1`}>Economics, trends, broader topics</p>
                </motion.div>
              )}
              {activeStatIndex === 5 && (
                <motion.div
                  key="market-insights"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <h3 className={`${textSecondary} text-sm mb-1`}>Market Insights</h3>
                  <p className={`text-3xl font-bold ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>{stats.marketInsights}</p>
                  <p className={`text-xs ${textMuted} mt-1`}>Coachella Valley specific</p>
                </motion.div>
              )}
              {activeStatIndex === 6 && (
                <motion.div
                  key="real-estate-tips"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full`}
                >
                  <h3 className={`${textSecondary} text-sm mb-1`}>Real Estate Tips</h3>
                  <p className={`text-3xl font-bold ${isLight ? "text-purple-600" : "text-purple-400"}`}>{stats.realEstateTips}</p>
                  <p className={`text-xs ${textMuted} mt-1`}>Buying/selling advice</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Carousel indicators */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <button
                key={index}
                onClick={() => setActiveStatIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeStatIndex === index
                    ? (isLight ? "bg-blue-500 w-4" : "bg-emerald-500 w-4")
                    : (isLight ? "bg-gray-300" : "bg-gray-600")
                }`}
              />
            ))}
          </div>
        </div>


        {/* Filters */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6 mb-6`}>
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex-1">
              <div className={`relative ${bgSecondary} ${border} rounded-2xl transition-all`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className={`w-5 h-5 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                  placeholder="Search articles..."
                  className={`w-full pl-12 pr-24 py-4 ${bgSecondary} ${textPrimary} placeholder:${textSecondary} rounded-2xl outline-none text-base focus:ring-2 ${isLight ? "focus:ring-blue-500" : "focus:ring-emerald-500"}`}
                />
                <button
                  onClick={handleSearch}
                  type="button"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl font-semibold transition-all ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                >
                  <Search className="w-5 h-5" />
                </button>
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
          </form>
        </div>

        {/* Articles Table */}
        <div className={`${cardBg} ${cardBorder} rounded-xl overflow-hidden`}>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className={`${bgSecondary}/50`}>
                <tr>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Image</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>Title</th>
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
                      <div className={`w-16 h-16 ${bgSecondary} ${border} rounded-lg overflow-hidden flex items-center justify-center`}>
                        {article.image ? (
                          <Image
                            src={article.image}
                            alt={article.title}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <FileText className={`w-6 h-6 ${textMuted}`} />
                        )}
                      </div>
                    </td>
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
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
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
                          onClick={() => handleDelete(article.slug)}
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
                  <div className={`w-20 h-20 flex-shrink-0 ${bgSecondary} ${border} rounded-lg overflow-hidden flex items-center justify-center`}>
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FileText className={`w-8 h-8 ${textMuted}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                    <h3 className={`${textPrimary} font-semibold text-base mb-1 line-clamp-2`}>
                      {article.title}
                    </h3>
                    <p className={`text-sm ${textSecondary} line-clamp-1`}>
                        {article.excerpt}
                      </p>
                    </div>
                    <span
                      className={`self-start px-2 py-1 rounded-full text-xs font-semibold ${
                    </span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 text-xs ${textMuted} mb-3`}>
                  <span className="capitalize">{article.category.replace("-", " ")}</span>
                  <span>•</span>
                  <span>•</span>
                  <span>{article.date}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push(`/insights/${article.category}/${article.slug}`)}
                    className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/admin/cms/edit/${article.slug}`)}
                    className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-emerald-600" : "hover:bg-gray-700 hover:text-emerald-400"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleUnpublish(article.slug)}
                    className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                      isLight ? "hover:bg-gray-100 hover:text-orange-600" : "hover:bg-gray-700 hover:text-orange-400"
                    } text-sm flex items-center justify-center gap-2`}
                  >
                    <EyeOff className="w-4 h-4" />
                    Unpublish
                  </button>
                  <button
                    onClick={() => handleDelete(article.slug)}
                    className={`col-span-2 p-2 rounded-lg transition-colors ${textSecondary} ${
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
