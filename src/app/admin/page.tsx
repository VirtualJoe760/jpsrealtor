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
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

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
      <SpaticalBackground className="min-h-screen flex items-center justify-center" showGradient={true}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </SpaticalBackground>
    );
  }

  if (error) {
    return (
      <SpaticalBackground className="min-h-screen flex items-center justify-center" showGradient={true}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </SpaticalBackground>
    );
  }

  if (!analytics) return null;

  return (
    <SpaticalBackground className="min-h-screen" showGradient={true}>
      <div className="min-h-screen" data-page="admin">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 pt-16 md:pt-0">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-400" />
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Comprehensive platform analytics and user insights</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-sm text-green-400">+{analytics.userSignups.last7Days} this week</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-white">{analytics.userSignups.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics.userSignups.today} new today
            </p>
          </div>

          {/* Total Favorites */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Heart className="w-8 h-8 text-red-400" />
              <span className="text-sm text-gray-400">All time</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Favorites</h3>
            <p className="text-3xl font-bold text-white">{analytics.favorites.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round(analytics.favorites.total / analytics.userSignups.total)} avg per user
            </p>
          </div>

          {/* Active Users */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-green-400" />
              <span className="text-sm text-green-400">Last 30 days</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Active Users</h3>
            <p className="text-3xl font-bold text-white">
              {analytics.engagement.activeUsersLast30Days.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics.engagement.activeUsersToday} active today
            </p>
          </div>

          {/* Engagement Score */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <span className="text-sm text-gray-400">Average</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Engagement Score</h3>
            <p className="text-3xl font-bold text-white">{analytics.engagement.averageEngagementScore}/100</p>
            <p className="text-xs text-gray-500 mt-2">Platform-wide average</p>
          </div>
        </div>

        {/* All Users Table */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              All Users
              <span className="text-sm text-gray-400 font-normal ml-2">
                (Sorted by activity)
              </span>
            </h2>
            <button
              onClick={fetchAnalytics}
              className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-sm font-semibold text-gray-400 pb-3">User</th>
                  <th className="text-left text-sm font-semibold text-gray-400 pb-3">Email</th>
                  <th className="text-center text-sm font-semibold text-gray-400 pb-3">Favorites</th>
                  <th className="text-center text-sm font-semibold text-gray-400 pb-3">Sessions</th>
                  <th className="text-center text-sm font-semibold text-gray-400 pb-3">Searches</th>
                  <th className="text-center text-sm font-semibold text-gray-400 pb-3">Engagement</th>
                  <th className="text-left text-sm font-semibold text-gray-400 pb-3">Last Active</th>
                  <th className="text-left text-sm font-semibold text-gray-400 pb-3">Top Location</th>
                </tr>
              </thead>
              <tbody>
                {analytics.activeUsers.map((user, idx) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-white font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-gray-400 text-sm">{user.email}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-white font-semibold">{user.totalFavorites}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-gray-300">{user.totalSessions}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-gray-300">{user.totalSearches}</span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${user.engagementScore}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-400">{user.engagementScore}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-gray-400">
                        {formatDate(user.lastActivityAt)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-gray-300">
                        {user.topCity || user.topSubdivision || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analytics.activeUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No users found
            </div>
          )}
        </div>

        {/* Favorites Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Property Types */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Top Property Types
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topSubTypes.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.type}</span>
                  <span className="text-sm font-semibold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Top Cities
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topCities.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.city}</span>
                  <span className="text-sm font-semibold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Subdivisions */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-400" />
              Top Subdivisions
            </h3>
            <div className="space-y-3">
              {analytics.favorites.topSubdivisions.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate max-w-[180px]">
                    {item.subdivision}
                  </span>
                  <span className="text-sm font-semibold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session & Search Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Metrics */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Session Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Sessions</span>
                <span className="text-xl font-bold text-white">
                  {analytics.sessions.totalSessions.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Avg Duration</span>
                <span className="text-xl font-bold text-white">
                  {formatDuration(analytics.sessions.avgSessionDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Avg Pages/Session</span>
                <span className="text-xl font-bold text-white">
                  {analytics.sessions.avgPagesPerSession}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Conversion Rate</span>
                <span className="text-xl font-bold text-green-400">
                  {analytics.sessions.conversionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Search Metrics */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-400" />
              Search Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Searches</span>
                <span className="text-xl font-bold text-white">
                  {analytics.searches.totalSearches.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Avg Results</span>
                <span className="text-xl font-bold text-white">
                  {analytics.searches.avgResultsPerSearch}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Avg Views/Search</span>
                <span className="text-xl font-bold text-white">
                  {analytics.searches.avgViewsPerSearch}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
