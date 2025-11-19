"use client";

import React from "react";

interface SubdivisionForumProps {
  subdivisionName: string;
  subdivisionSlug: string;
}

export default function SubdivisionForum({
  subdivisionName,
  subdivisionSlug,
}: SubdivisionForumProps) {
  // Placeholder forum posts (will be replaced with real data from database)
  const placeholderPosts = [
    {
      id: 1,
      author: "Community Member",
      title: "Welcome to the discussion board!",
      preview: "This is where residents and prospective buyers can discuss...",
      replies: 0,
      views: 0,
      date: "Coming Soon",
    },
    {
      id: 2,
      author: "Community Member",
      title: "Questions about amenities",
      preview: "Feel free to ask questions about the community facilities...",
      replies: 0,
      views: 0,
      date: "Coming Soon",
    },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Community Forum
          </h2>
          <p className="text-sm text-gray-300">
            Connect with residents and share insights about {subdivisionName}
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-gray-700 text-gray-400 rounded-md cursor-not-allowed text-sm font-medium flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Topic (Coming Soon)
        </button>
      </div>

      {/* Authentication Notice */}
      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-300">
              Sign in to create posts, reply to discussions, and connect with the{" "}
              {subdivisionName} community.
            </p>
          </div>
        </div>
      </div>

      {/* Forum Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-900/50 border border-blue-800 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">General</h3>
              <p className="text-xs text-gray-400">0 topics</p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            General discussions about living in the community
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-900/50 border border-green-800 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">For Sale / Rent</h3>
              <p className="text-xs text-gray-400">0 topics</p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            Listings and rental opportunities
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-900/50 border border-purple-800 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Community Events</h3>
              <p className="text-xs text-gray-400">0 topics</p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            Local events and social gatherings
          </p>
        </div>
      </div>

      {/* Forum Posts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Recent Discussions</h3>
          <div className="flex gap-2">
            <button
              disabled
              className="text-sm text-gray-500 cursor-not-allowed flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
              </svg>
              Latest
            </button>
          </div>
        </div>

        {placeholderPosts.map((post) => (
          <div
            key={post.id}
            className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors bg-gray-800 opacity-60"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-7 h-7 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white mb-1">{post.title}</h4>
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                  {post.preview}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.replies} replies</span>
                  <span>•</span>
                  <span>{post.views} views</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}

        <div className="text-center text-sm text-gray-400 py-4">
          Forum discussions will be available once user authentication is enabled
        </div>
      </div>
    </div>
  );
}
