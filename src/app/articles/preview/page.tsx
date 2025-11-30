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
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8 pt-16 md:pt-0">
          <a href="/insights" className={`inline-flex items-center gap-2 transition-colors ${
            isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
          }`}>
            <span>← Back to articles</span>
          </a>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <div className={`flex items-center gap-2 mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            <Tag className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">ARTICLE</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {title}
          </h1>
          <div className={`flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              Published on {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Featured Image */}
        <div className={`mb-12 rounded-2xl overflow-hidden border ${
          isLight ? 'border-gray-300' : 'border-gray-800'
        }`}>
          <div className="relative w-full h-[400px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isLight ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : 'bg-gradient-to-br from-gray-800 to-gray-900'
              }`}>
                <div className="text-center">
                  <Tag className={`w-16 h-16 mx-auto mb-4 ${
                    isLight ? 'text-blue-300' : 'text-gray-600'
                  }`} />
                  <p className={`text-sm ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    No featured image
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Article Content */}
        <article className={`rounded-2xl p-6 md:p-12 mb-12 ${
          isLight
            ? 'bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md'
            : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
        }`}>
          {content ? (
            <div className={`max-w-none ${
              isLight
                ? `prose prose-lg
                   prose-headings:text-gray-900
                   prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                   prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                   prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                   prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                   prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline
                   prose-strong:text-gray-900 prose-strong:font-semibold
                   prose-ul:text-gray-700 prose-ul:my-6
                   prose-ol:text-gray-700 prose-ol:my-6
                   prose-li:my-2
                   prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                   prose-code:text-blue-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                   prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-300 prose-pre:rounded-xl
                   prose-img:rounded-xl prose-img:border prose-img:border-gray-300
                   prose-hr:border-gray-300 prose-hr:my-8`
                : `prose prose-invert prose-lg
                   prose-headings:text-white
                   prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                   prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                   prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                   prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                   prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 hover:prose-a:underline
                   prose-strong:text-white prose-strong:font-semibold
                   prose-ul:text-gray-300 prose-ul:my-6
                   prose-ol:text-gray-300 prose-ol:my-6
                   prose-li:my-2
                   prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
                   prose-code:text-emerald-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                   prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-xl
                   prose-img:rounded-xl prose-img:border prose-img:border-gray-700
                   prose-hr:border-gray-700 prose-hr:my-8`
            }`}>
              <ReactMarkdown>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className={`text-lg ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                Start writing to see your article preview...
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

export default function ArticlePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
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
