// src/app/admin/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  Heart,
  TrendingUp,
  Search,
  Clock,
  BarChart3,
  Activity,
  MapPin,
  Building2,
  Calendar,
} from "lucide-react";
import AdminNav from "@/app/components/AdminNav";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

type AdminAnalytics = {
  userSignups: {
    total: number;
    last30Days: number;
    last7Days: number;
    today: number;
    timeline: Array<{ _id: string; count: number }>;
  };
  favorites: {
    total: number;
    topSubTypes: Array<{ type: string; count: number }>;
    topCities: Array<{ city: string; count: number }>;
    topSubdivisions: Array<{ subdivision: string; count: number }>;
    timeline: Array<{ _id: string; count: number }>;
  };
  activeUsers: Array<{
    _id: string;
    email: string;
    name: string;
    createdAt: string;
    totalFavorites: number;
    totalSessions: number;
    totalSearches: number;
    totalListingsViewed: number;
    lastActivityAt: string;
    engagementScore: number;
    lastSessionDuration: number;
    topCity: string | null;
    topSubdivision: string | null;
  }>;
  engagement: {
    usersWithActivity: number;
    activeUsersLast30Days: number;
    activeUsersLast7Days: number;
    activeUsersToday: number;
    averageEngagementScore: number;
  };
  sessions: {
    totalSessions: number;
    avgSessionDuration: number;
    avgPagesPerSession: number;
    conversionRate: number;
  };
  searches: {
    totalSearches: number;
    avgResultsPerSearch: number;
    avgViewsPerSearch: number;
    topSearchedCities: Array<{ city: string; count: number }>;
    topSearchedSubdivisions: Array<{ subdivision: string; count: number }>;
  };
};

export default function AdminDashboard() {
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
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/analytics");

      if (response.status === 403) {
        setError("Access denied. Admin privileges required.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Error fetching admin analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return "0s";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isLight ? 'border-blue-500' : 'border-emerald-500'} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={textSecondary}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Access Denied</h2>
          <p className={textSecondary}>{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin">
      <div className="max-w-7xl mx-auto">
        <AdminNav />

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-3`}>
            <BarChart3 className={`w-10 h-10 ${isLight ? 'text-blue-500' : 'text-emerald-400'}`} />
            Admin Dashboard
          </h1>
          <p className={textSecondary}>Comprehensive platform analytics and user insights</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Users className={`w-8 h-8 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
              <span className="text-sm text-green-500">+{analytics.userSignups.last7Days} this week</span>
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Total Users</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{analytics.userSignups.total.toLocaleString()}</p>
            <p className={`text-xs ${textMuted} mt-2`}>
              {analytics.userSignups.today} new today
            </p>
          </div>

          {/* Total Favorites */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Heart className="w-8 h-8 text-red-400" />
              <span className={`text-sm ${textSecondary}`}>All time</span>
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Total Favorites</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{analytics.favorites.total.toLocaleString()}</p>
            <p className={`text-xs ${textMuted} mt-2`}>
              {Math.round(analytics.favorites.total / analytics.userSignups.total)} avg per user
            </p>
          </div>

          {/* Active Users */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Activity className={`w-8 h-8 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              <span className="text-sm text-green-500">Last 30 days</span>
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Active Users</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>
              {analytics.engagement.activeUsersLast30Days.toLocaleString()}
            </p>
            <p className={`text-xs ${textMuted} mt-2`}>
              {analytics.engagement.activeUsersToday} active today
            </p>
          </div>

          {/* Engagement Score */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className={`w-8 h-8 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              <span className={`text-sm ${textSecondary}`}>Average</span>
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Engagement Score</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>{analytics.engagement.averageEngagementScore}/100</p>
            <p className={`text-xs ${textMuted} mt-2`}>Platform-wide average</p>
          </div>
        </div>

        {/* All Users Table */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6 mb-8`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}>
              <Users className={`w-6 h-6 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
              All Users
              <span className={`text-sm ${textSecondary} font-normal ml-2`}>
                (Sorted by activity)
              </span>
            </h2>
            <button
              onClick={fetchAnalytics}
              className={`text-sm px-4 py-2 ${buttonPrimary} rounded-lg transition-colors`}
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${border}`}>
                  <th className={`text-left text-sm font-semibold ${textSecondary} pb-3`}>User</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} pb-3`}>Email</th>
                  <th className={`text-center text-sm font-semibold ${textSecondary} pb-3`}>Favorites</th>
                  <th className={`text-center text-sm font-semibold ${textSecondary} pb-3`}>Sessions</th>
                  <th className={`text-center text-sm font-semibold ${textSecondary} pb-3`}>Searches</th>
                  <th className={`text-center text-sm font-semibold ${textSecondary} pb-3`}>Engagement</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} pb-3`}>Last Active</th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} pb-3`}>Top Location</th>
                </tr>
              </thead>
              <tbody>
                {analytics.activeUsers.map((user, idx) => (
                  <tr
                    key={user._id}
                    className={`border-b ${border} ${cardHover} transition-colors`}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/10 text-blue-400'} flex items-center justify-center font-semibold text-sm`}>
                          {idx + 1}
                        </div>
                        <span className={`${textPrimary} font-medium`}>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`${textSecondary} text-sm`}>{user.email}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`${textPrimary} font-semibold`}>{user.totalFavorites}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={textSecondary}>{user.totalSessions}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={textSecondary}>{user.totalSearches}</span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-16 ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded-full h-2`}>
                          <div
                            className={`${isLight ? 'bg-blue-500' : 'bg-blue-500'} h-2 rounded-full`}
                            style={{ width: `${user.engagementScore}%` }}
                          ></div>
                        </div>
                        <span className={`ml-2 text-sm ${textSecondary}`}>{user.engagementScore}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`text-sm ${textSecondary}`}>
                        {formatDate(user.lastActivityAt)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`text-sm ${textSecondary}`}>
                        {user.topCity || user.topSubdivision || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analytics.activeUsers.length === 0 && (
            <div className={`text-center py-12 ${textSecondary}`}>
              No users found
            </div>
          )}
        </div>

        {/* Favorites Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Property Types */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Building2 className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              Top Property Types
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topSubTypes.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondary}`}>{item.type}</span>
                  <span className={`text-sm font-semibold ${textPrimary}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cities */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <MapPin className={`w-5 h-5 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
              Top Cities
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topCities.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondary}`}>{item.city}</span>
                  <span className={`text-sm font-semibold ${textPrimary}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Subdivisions */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Building2 className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              Top Subdivisions
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topSubdivisions.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondary} truncate max-w-[180px]`}>
                    {item.subdivision}
                  </span>
                  <span className={`text-sm font-semibold ${textPrimary}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session & Search Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Metrics */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Clock className={`w-5 h-5 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
              Session Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Total Sessions</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {analytics.sessions.totalSessions.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Avg Duration</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {formatDuration(analytics.sessions.avgSessionDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Avg Pages/Session</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {analytics.sessions.avgPagesPerSession}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Conversion Rate</span>
                <span className={`text-xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                  {analytics.sessions.conversionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Search Metrics */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Search className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              Search Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Total Searches</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {analytics.searches.totalSearches.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Avg Results</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {analytics.searches.avgResultsPerSearch}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Avg Views/Search</span>
                <span className={`text-xl font-bold ${textPrimary}`}>
                  {analytics.searches.avgViewsPerSearch}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
