"use client";

import { motion } from "framer-motion";
import { Post } from "@/types/post";
import { ArrowLeft, Calendar, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ArticlePageClientProps {
  post: Post;
  category: string;
  mdxContent: ReactNode;
}

export default function ArticlePageClient({ post, category, mdxContent }: ArticlePageClientProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 pt-16 md:pt-0"
        >
          <Link
            href="/insights"
            className={`inline-flex items-center gap-2 transition-colors ${
              isLight
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to insights</span>
          </Link>
        </motion.div>

        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className={`flex items-center gap-2 mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Article</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {post.title || "Untitled Post"}
          </h1>
          <div className={`flex items-center gap-2 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              Published on {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </motion.div>

        {/* Featured Image */}
        {post.image && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`mb-12 rounded-2xl overflow-hidden border ${
              isLight ? 'border-gray-300' : 'border-gray-800'
            }`}
          >
            <div className="relative w-full h-[400px]">
              <Image
                src={post.image}
                alt={post.altText || post.title || "Article image"}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        )}

        {/* Article Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`rounded-2xl p-6 md:p-12 mb-12 ${
            isLight
              ? 'bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md'
              : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : {}}
        >
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
            {mdxContent}
          </div>
        </motion.article>
      </div>
    </div>
  );
}
