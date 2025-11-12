"use client";

import React from "react";

interface SubdivisionReviewsProps {
  subdivisionName: string;
  subdivisionSlug: string;
}

export default function SubdivisionReviews({
  subdivisionName,
  subdivisionSlug,
}: SubdivisionReviewsProps) {
  // Placeholder reviews (will be replaced with real data from database)
  const placeholderReviews = [
    {
      id: 1,
      author: "User Name",
      rating: 5,
      date: "Coming Soon",
      comment: "Review content will appear here once user authentication is enabled.",
    },
    {
      id: 2,
      author: "User Name",
      rating: 4,
      date: "Coming Soon",
      comment: "Review content will appear here once user authentication is enabled.",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Reviews & Ratings
      </h2>

      {/* Summary Stats Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl font-bold text-gray-900">--</div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-5 h-5 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="text-sm text-gray-600">No reviews yet</div>
          </div>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Be the first to review {subdivisionName}
        </div>

        {/* Rating Distribution Placeholder */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2">
              <div className="text-sm text-gray-600 w-8">{rating}★</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-gray-300 h-2 rounded-full w-0"></div>
              </div>
              <div className="text-sm text-gray-600 w-8">0</div>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1"
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
            <h3 className="font-semibold text-gray-900 mb-1">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Sign in to leave a review and share your experience living in{" "}
              {subdivisionName}.
            </p>
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
            >
              Write a Review (Coming Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder Reviews */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Recent Reviews</h3>
        {placeholderReviews.map((review) => (
          <div
            key={review.id}
            className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-500"
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
                <div>
                  <div className="font-medium text-gray-700">{review.author}</div>
                  <div className="text-xs text-gray-500">{review.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 italic">{review.comment}</p>
          </div>
        ))}

        <div className="text-center text-sm text-gray-500 py-4">
          Reviews will be available once user authentication is enabled
        </div>
      </div>
    </div>
  );
}
