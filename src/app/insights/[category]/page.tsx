// src\app\insights\[category]\page.tsx

import { getPostsBySection } from "@/utils/fetchPosts";
import InsightsList from "@/components/InsightsList";
import { insightsCategoriesContent, categoriesPageContent } from "@/constants/staticContent";
import { Metadata } from "next";
import CategoryPageClient from "./CategoryPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;

  // Format the category name
  const formattedCategory = category
    .replace("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const selectedCategory = insightsCategoriesContent.categories.find(
    (cat) => cat.href.split("/").pop() === category
  );

  if (!selectedCategory) {
    return {
      title: "Insights | Coachella Valley Real Estate",
      description: "Explore real estate insights, market trends, and local community tips.",
      keywords: ["real estate insights", "market trends", "Coachella Valley"],
    };
  }

  return {
    title: categoriesPageContent.title(formattedCategory),
    description: categoriesPageContent.description(formattedCategory),
    keywords: ["real estate insights", ...formattedCategory.split(" ")],
    openGraph: {
      title: categoriesPageContent.title(formattedCategory),
      description: categoriesPageContent.description(formattedCategory),
      images: [{ url: selectedCategory.imageUrl }],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1;

  // Format category name
  const formattedCategory = category
    .replace("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  // Fetch posts with pagination
  const { posts, totalPages } = await getPostsBySection(category, page, 5);

  const selectedCategory = insightsCategoriesContent.categories.find(
    (cat) => cat.href.split("/").pop() === category
  );

  return (
    <CategoryPageClient
      formattedCategory={formattedCategory}
      category={category}
      posts={posts}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
