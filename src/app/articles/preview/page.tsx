// src/app/articles/preview/page.tsx
"use client";

import { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Tag, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

function PreviewContent() {
  const searchParams = useSearchParams();

  const title = searchParams.get("title") || "Untitled Article";
  const excerpt = searchParams.get("excerpt") || "";
  const content = searchParams.get("content") || "";
  const category = searchParams.get("category") || "articles";
  const imageUrl = searchParams.get("imageUrl") || "";

  const categoryNames: Record<string, string> = {
    articles: "Articles",
    "market-insights": "Market Insights",
    "real-estate-tips": "Real Estate Tips",
  };

  return (
    <article className="min-h-screen bg-white">
      {/* Hero Image */}
      {imageUrl && (
        <div className="relative w-full h-64 bg-gray-200">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Category Badge */}
        <div className="mb-4">
          <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            {categoryNames[category]}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {title}
        </h1>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-xl text-gray-600 mb-6 leading-relaxed">
            {excerpt}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Joseph Sardella</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Article Content */}
        {content ? (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="ml-4" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4" {...props} />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props} />
                  ),
                a: ({ node, ...props }) => (
                  <a className="text-blue-600 hover:text-blue-700 underline" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              Start writing to see your article preview...
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ArticlePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading preview...</p>
        </div>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
