// src\app\insights\[category]\page.tsx

import { getPostsBySection } from "@/utils/fetchPosts";
import InsightsList from "@/components/InsightsList";
import { insightsCategoriesContent, categoriesPageContent } from "@/constants/staticContent";
import VariableHero from "@/components/VariableHero";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const category = params.category;

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
  params: { category: string };
  searchParams: { page?: string };
}) {
  const { category } = params;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  // Format category name
  const formattedCategory = category
    .replace("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  // Fetch posts with pagination
  const { posts, totalPages } = await getPostsBySection(category, page, 5);

  return (
    <>
      <VariableHero
        backgroundImage="/misc/house1.png"
        heroContext={categoriesPageContent.title(formattedCategory)}
      />
      <div className="bg-black text-white">
        <header className="text-start py-12 px-6 lg:px-12">
          <h1 className="text-4xl mt-4 mb-8 max-w-3xl mx-auto font-bold">
            Read {categoriesPageContent.title(formattedCategory)}
          </h1>
          <p className="text-lg mt-4 mb-8 max-w-3xl mx-auto">
            {categoriesPageContent.description(formattedCategory)}
          </p>
        </header>
        <InsightsList
          posts={posts}
          totalPages={totalPages}
          currentPage={page}
          category={category}
        />
      </div>
    </>
  );
}
