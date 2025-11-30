// src/app/articles/preview/page.tsx
"use client";

import { use, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Tag, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

function PreviewContent() {
  const searchParams = useSearchParams();

  // Detect if we're in an iframe and add class to body
  useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      document.body.classList.add("in-iframe");
    }
  }, []);

  const title = searchParams.get("title") || "Untitled Article";
  const excerpt = searchParams.get("excerpt") || "";
  const content = searchParams.get("content") || "";
  const category = searchParams.get("category") || "articles";
  const imageUrl = searchParams.get("imageUrl") || "";
  const theme = searchParams.get("theme") || "lightgradient";

  // Apply theme to HTML element
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.className = `theme-${theme}`;
    }
  }, [theme]);

  const isLight = theme === "lightgradient";

  const categoryNames: Record<string, string> = {
    articles: "Articles",
    "market-insights": "Market Insights",
    "real-estate-tips": "Real Estate Tips",
  };

  return (
    <article className={`min-h-screen ${isLight ? "bg-white" : "bg-gray-900"}`}>
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
          <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
            isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"
          }`}>
            {categoryNames[category]}
          </span>
        </div>

        {/* Title */}
        <h1 className={`text-4xl font-bold mb-4 leading-tight ${
          isLight ? "text-gray-900" : "text-white"
        }`}>
          {title}
        </h1>

        {/* Excerpt */}
        {excerpt && (
          <p className={`text-xl mb-6 leading-relaxed ${
            isLight ? "text-gray-600" : "text-gray-300"
          }`}>
            {excerpt}
          </p>
        )}

        {/* Meta Info */}
        <div className={`flex flex-wrap items-center gap-4 text-sm mb-8 pb-8 border-b ${
          isLight ? "text-gray-500 border-gray-200" : "text-gray-400 border-gray-700"
        }`}>
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
                  <h1 className={`text-3xl font-bold mt-8 mb-4 ${isLight ? "text-gray-900" : "text-white"}`} {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className={`text-2xl font-bold mt-6 mb-3 ${isLight ? "text-gray-900" : "text-white"}`} {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className={`text-xl font-bold mt-4 mb-2 ${isLight ? "text-gray-900" : "text-gray-100"}`} {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className={`mb-4 leading-relaxed ${isLight ? "text-gray-700" : "text-gray-300"}`} {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className={`list-disc list-inside mb-4 space-y-2 ${isLight ? "text-gray-700" : "text-gray-300"}`} {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className={`list-decimal list-inside mb-4 space-y-2 ${isLight ? "text-gray-700" : "text-gray-300"}`} {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="ml-4" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className={`border-l-4 pl-4 italic my-4 ${
                    isLight ? "border-blue-500 text-gray-600" : "border-emerald-500 text-gray-400"
                  }`} {...props} />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className={`px-2 py-1 rounded text-sm font-mono ${
                      isLight ? "bg-gray-100 text-gray-800" : "bg-gray-800 text-gray-200"
                    }`} {...props} />
                  ) : (
                    <code className={`block p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4 ${
                      isLight ? "bg-gray-100 text-gray-800" : "bg-gray-800 text-gray-200"
                    }`} {...props} />
                  ),
                a: ({ node, ...props }) => (
                  <a className={`underline ${
                    isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"
                  }`} {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`} {...props} />
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
            <p className={`text-lg ${isLight ? "text-gray-400" : "text-gray-500"}`}>
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
