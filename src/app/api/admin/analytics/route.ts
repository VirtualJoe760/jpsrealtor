// src/app/api/admin/analytics/route.ts
// Admin dashboard analytics endpoint

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import { UserSession, SearchActivity, ListingView } from "@/models/user-activity";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    console.log("Generating admin analytics...");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. USER SIGNUP ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────

    const totalUsers = await User.countDocuments();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newUsersLast7Days = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

    // Daily signup trend (last 30 days)
    const signupTimeline = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FAVORITE PROPERTIES ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────

    const totalFavorites = await User.aggregate([
      {
        $project: {
          favCount: { $size: { $ifNull: ["$likedListings", []] } },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$favCount" },
        },
      },
    ]);

    const totalFavoritesCount = totalFavorites[0]?.total || 0;

    // Most favorited property subtypes
    const topFavoritedSubTypes = await User.aggregate([
      { $unwind: "$likedListings" },
      {
        $group: {
          _id: "$likedListings.propertySubType",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          type: "$_id",
          count: 1,
        },
      },
    ]);

    // Most favorited cities
    const topFavoritedCities = await User.aggregate([
      { $unwind: "$likedListings" },
      {
        $group: {
          _id: "$likedListings.city",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          city: "$_id",
          count: 1,
        },
      },
    ]);

    // Most favorited subdivisions
    const topFavoritedSubdivisions = await User.aggregate([
      { $unwind: "$likedListings" },
      {
        $group: {
          _id: "$likedListings.subdivision",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          subdivision: "$_id",
          count: 1,
        },
      },
    ]);

    // Favorites timeline (last 30 days)
    const favoritesTimeline = await User.aggregate([
      { $unwind: "$likedListings" },
      {
        $match: {
          "likedListings.swipedAt": { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$likedListings.swipedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ALL USERS (sorted by recent activity, then by creation date)
    // ─────────────────────────────────────────────────────────────────────────

    const allUsers = await User.find({})
      .sort({
        "activityMetrics.lastActivityAt": -1,
        createdAt: -1,
      })
      .select({
        email: 1,
        name: 1,
        createdAt: 1,
        activityMetrics: 1,
        likedListings: 1,
        swipeAnalytics: 1,
      })
      .lean();

    // Calculate additional metrics for each user
    const enrichedActiveUsers = allUsers.map((u: any) => ({
      _id: u._id,
      email: u.email,
      name: u.name || "Anonymous",
      createdAt: u.createdAt,
      totalFavorites: u.likedListings?.length || 0,
      totalSessions: u.activityMetrics?.totalSessions || 0,
      totalSearches: u.activityMetrics?.totalSearches || 0,
      totalListingsViewed: u.activityMetrics?.totalListingsViewed || 0,
      lastActivityAt: u.activityMetrics?.lastActivityAt || u.createdAt,
      engagementScore: u.activityMetrics?.engagementScore || 0,
      lastSessionDuration: u.activityMetrics?.lastSessionDuration || 0,
      topCity: u.swipeAnalytics?.topCities?.[0]?.name || null,
      topSubdivision: u.swipeAnalytics?.topSubdivisions?.[0]?.name || null,
    }));

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ENGAGEMENT METRICS
    // ─────────────────────────────────────────────────────────────────────────

    const usersWithActivity = await User.countDocuments({
      "activityMetrics.lastActivityAt": { $exists: true },
    });

    const activeUsersLast30Days = await User.countDocuments({
      "activityMetrics.lastActivityAt": { $gte: thirtyDaysAgo },
    });

    const activeUsersLast7Days = await User.countDocuments({
      "activityMetrics.lastActivityAt": { $gte: sevenDaysAgo },
    });

    const activeUsersToday = await User.countDocuments({
      "activityMetrics.lastActivityAt": { $gte: oneDayAgo },
    });

    // Average engagement score
    const avgEngagement = await User.aggregate([
      {
        $match: {
          "activityMetrics.engagementScore": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$activityMetrics.engagementScore" },
        },
      },
    ]);

    const averageEngagementScore = avgEngagement[0]?.avgScore || 0;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SESSION ANALYTICS (if sessions exist)
    // ─────────────────────────────────────────────────────────────────────────

    interface SessionMetrics {
      totalSessions: number;
      avgSessionDuration: number;
      avgPagesPerSession: number;
      conversionRate: number;
    }

    let sessionMetrics: SessionMetrics = {
      totalSessions: 0,
      avgSessionDuration: 0,
      avgPagesPerSession: 0,
      conversionRate: 0,
    };

    try {
      const totalSessions = await UserSession.countDocuments();

      if (totalSessions > 0) {
        const sessionStats = await UserSession.aggregate([
          {
            $group: {
              _id: null,
              avgDuration: { $avg: "$duration" },
              avgPages: { $avg: "$pagesViewed" },
              totalConverted: {
                $sum: { $cond: ["$converted", 1, 0] },
              },
              total: { $sum: 1 },
            },
          },
        ]);

        if (sessionStats[0]) {
          sessionMetrics = {
            totalSessions,
            avgSessionDuration: Math.round(sessionStats[0].avgDuration || 0),
            avgPagesPerSession: Math.round(sessionStats[0].avgPages || 0),
            conversionRate: Math.round(
              (sessionStats[0].totalConverted / sessionStats[0].total) * 100
            ),
          };
        }
      }
    } catch (error) {
      console.log("Session data not yet available");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. SEARCH ANALYTICS (if searches exist)
    // ─────────────────────────────────────────────────────────────────────────

    interface SearchCity {
      city: string;
      count: number;
    }

    interface SearchSubdivision {
      subdivision: string;
      count: number;
    }

    interface SearchMetrics {
      totalSearches: number;
      avgResultsPerSearch: number;
      avgViewsPerSearch: number;
      topSearchedCities: SearchCity[];
      topSearchedSubdivisions: SearchSubdivision[];
    }

    let searchMetrics: SearchMetrics = {
      totalSearches: 0,
      avgResultsPerSearch: 0,
      avgViewsPerSearch: 0,
      topSearchedCities: [],
      topSearchedSubdivisions: [],
    };

    try {
      const totalSearches = await SearchActivity.countDocuments();

      if (totalSearches > 0) {
        const searchStats = await SearchActivity.aggregate([
          {
            $group: {
              _id: null,
              avgResults: { $avg: "$resultsCount" },
              avgViews: { $avg: "$resultsViewed" },
            },
          },
        ]);

        const topCities = await SearchActivity.aggregate([
          { $unwind: "$filters.cities" },
          {
            $group: {
              _id: "$filters.cities",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]);

        const topSubdivisions = await SearchActivity.aggregate([
          { $unwind: "$filters.subdivisions" },
          {
            $group: {
              _id: "$filters.subdivisions",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]);

        searchMetrics = {
          totalSearches,
          avgResultsPerSearch: Math.round(searchStats[0]?.avgResults || 0),
          avgViewsPerSearch: Math.round(searchStats[0]?.avgViews || 0),
          topSearchedCities: topCities.map((c) => ({
            city: c._id,
            count: c.count,
          })),
          topSearchedSubdivisions: topSubdivisions.map((s) => ({
            subdivision: s._id,
            count: s.count,
          })),
        };
      }
    } catch (error) {
      console.log("Search data not yet available", error);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    console.log("Admin analytics generated successfully");

    return NextResponse.json({
      userSignups: {
        total: totalUsers,
        last30Days: newUsersLast30Days,
        last7Days: newUsersLast7Days,
        today: newUsersToday,
        timeline: signupTimeline,
      },
      favorites: {
        total: totalFavoritesCount,
        topSubTypes: topFavoritedSubTypes,
        topCities: topFavoritedCities,
        topSubdivisions: topFavoritedSubdivisions,
        timeline: favoritesTimeline,
      },
      activeUsers: enrichedActiveUsers,
      engagement: {
        usersWithActivity,
        activeUsersLast30Days,
        activeUsersLast7Days,
        activeUsersToday,
        averageEngagementScore: Math.round(averageEngagementScore),
      },
      sessions: sessionMetrics,
      searches: searchMetrics,
    });
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    );
  }
}