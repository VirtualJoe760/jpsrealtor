"use client";

import { motion } from "framer-motion";
import InsightsList from "@/components/InsightsList";
import { categoriesPageContent } from "@/constants/staticContent";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";

interface CategoryPageClientProps {
  formattedCategory: string;
  category: string;
  posts: any[];
  totalPages: number;
  currentPage: number;
  categoryIcon?: string;
}

export default function CategoryPageClient({
  formattedCategory,
  category,
  posts,
  totalPages,
  currentPage,
  categoryIcon,
}: CategoryPageClientProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
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
            <span>Back to Insights</span>
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <div className={`flex items-center gap-2 mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Category</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {categoriesPageContent.title(formattedCategory)}
          </h1>
          <p className={`text-xl max-w-3xl leading-relaxed ${
            isLight ? 'text-gray-700' : 'text-gray-300'
          }`}>
            {categoriesPageContent.description(formattedCategory)}
          </p>
        </motion.div>

        {/* Articles List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-2xl p-6 md:p-8 ${
            isLight
              ? 'bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md'
              : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : {}}
        >
          <InsightsList
            posts={posts}
            totalPages={totalPages}
            currentPage={currentPage}
            category={category}
          />
        </motion.div>
      </div>
    </div>
  );
}
