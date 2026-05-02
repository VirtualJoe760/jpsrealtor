import { getPostBySlug } from "@/utils/fetchPosts";
import { MDXRemote } from "next-mdx-remote/rsc";
import YouTube from "@/components/mdx/YouTube";
import { Post } from "@/types/post";
import MDXLink from "@/app/components/mdx/Link";
import ArticlePageClient from "./ArticlePageClient";
import { ArticleJsonLd } from "@/app/components/seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import { getBaseUrlFromHeaders, doesDomainBelongToAgent } from "@/lib/domain-utils";

/**
 * Check if an article can be viewed on the current domain.
 * Public articles: visible everywhere.
 * Private articles: only on the author's domains (subdomain, custom domain, or platform).
 */
async function canViewArticle(post: Post): Promise<boolean> {
  const visibility = (post as any).visibility;
  if (!visibility || visibility === 'public') return true;
  if (!post.authorId) return false;
  return doesDomainBelongToAgent(post.authorId);
}

// Dynamic metadata generation
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slugId: string }>;
}) {
  const { slugId } = await params; // Destructure params directly

  if (!slugId) {
    console.error("Missing slugId for metadata.");
    return { title: "Post Not Found", description: "Content not found." };
  }

  const post = await getPostBySlug(slugId).catch(() => null);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post does not exist.",
    };
  }

  return {
    title: post.title || "Untitled Blog Post",
    description: post.metaDescription || post.description || "Explore real estate insights.",
    openGraph: {
      title: post.title || "Untitled Blog Post",
      description: post.metaDescription || post.description || "Explore real estate insights.",
      images: [{ url: post.image || "/default-og-image.jpg", alt: post.altText || "Hero Image" }],
    },
  };
}

const components = {
  YouTube, // Register the YouTube component for MDX rendering
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ category: string; slugId: string }>;
}) {
  const resolvedParams = await params;
  const { slugId, category } = resolvedParams;

  if (!slugId) {
    console.error("Missing slugId parameter in URL.");
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
        <p>Invalid URL: Missing content identifier.</p>
        <a href="/" className="text-indigo-500 hover:underline">
          Back to Insights
        </a>
      </div>
    );
  }

  try {
    // Fetch the post data
    const post: Post | null = await getPostBySlug(slugId).catch(() => null);

    if (!post) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
          <p>Sorry, the requested post could not be found.</p>
          <a href="/" className="text-indigo-500 hover:underline">
            Back to Insights
          </a>
        </div>
      );
    }

    // Check if article can be viewed on this domain
    const canView = await canViewArticle(post);
    if (!canView) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
          <p>This article is not available on this domain.</p>
          <a href="/" className="text-indigo-500 hover:underline">
            Back to Insights
          </a>
        </div>
      );
    }

    // Render MDX content on server
    const mdxContent = <MDXRemote source={post.content} components={{ YouTube, MDXLink }} />;

    const baseUrl = await getBaseUrlFromHeaders();
    const articleUrl = `${baseUrl}/insights/${category}/${slugId}`;
    const breadcrumbItems = [
      { name: "Home", url: baseUrl },
      { name: "Insights", url: `${baseUrl}/insights` },
      { name: post.title, url: articleUrl },
    ];

    return (
      <>
        <ArticleJsonLd
          title={post.title}
          description={post.metaDescription || post.description || ""}
          url={articleUrl}
          image={post.image}
          datePublished={post.date}
          section={category}
        />
        <BreadcrumbJsonLd items={breadcrumbItems} />
        <ArticlePageClient post={post} category={category} mdxContent={mdxContent} />
      </>
    );
  } catch (error) {
    console.error("Error rendering post:", error);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-white">
        <p>Something went wrong while loading the post.</p>
        <a href="/" className="text-indigo-500 hover:underline">
          Back to Insights
        </a>
      </div>
    );
  }
}
