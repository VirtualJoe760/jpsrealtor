import { getPostsBySection } from "@/utils/fetchPosts";
import InsightsList from "@/components/InsightsList";
import { insightsCategoriesContent } from "@/constants/staticContent";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const category = params.category;

  // Find matching category's SEO data
  const selectedCategory = insightsCategoriesContent.categories.find(
    (cat) => cat.href.split("/").pop() === category
  );

  if (!selectedCategory) {
    return {
      title: "Insights | Coachella Valley Real Estate",
      description: "Explore our insights into real estate, market trends, and local community tips.",
      keywords: ["real estate insights", "market trends", "Coachella Valley"],
    };
  }

  return {
    title: `${selectedCategory.title} - Real Estate Insights`,
    description: selectedCategory.description,
    keywords: ["real estate insights", ...selectedCategory.title.split(" ")],
    openGraph: {
      title: `${selectedCategory.title} - Real Estate Insights`,
      description: selectedCategory.description,
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

  // Fetch posts with pagination
  const { posts, totalPages } = await getPostsBySection(category, page, 5);

  return (
    <div className="bg-black text-white">
      <InsightsList
        posts={posts}
        totalPages={totalPages}
        currentPage={page}
        category={category}
      />
    </div>
  );
}
