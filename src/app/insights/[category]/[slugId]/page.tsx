import { getPostBySlug } from "@/utils/fetchPosts";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import YouTube from "@/components/mdx/YouTube";
import { Post } from "@/types/post";
import MDXLink from "@/app/components/mdx/Link";
import { rehypeUnwrapNestedP } from "@/lib/mdx/rehype-unwrap-nested-p";
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
  const { category, slugId } = await params; // Destructure params directly

  if (!slugId) {
    console.error("Missing slugId for metadata.");
    return { title: "Post Not Found", description: "Content not found." };
  }

  const post = await getPostBySlug(slugId).catch(() => null);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post does not exist.",
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = await getBaseUrlFromHeaders();

  return {
    title: post.title || "Untitled Blog Post",
    description: post.metaDescription || post.description || "Explore real estate insights.",
    // Articles carried NO canonical at all. That was survivable while the root
    // layout stamped the bare domain onto everything (no canonical beats a wrong
    // one), but these are the highest-CTR pages on the site (1.74% vs 0.35% for
    // city pages), and a self-canonical is what stops a category reshuffle or a
    // tracking param splitting their equity across duplicate URLs.
    alternates: {
      canonical: `${baseUrl}/insights/${category}/${slugId}`,
    },
    openGraph: {
      title: post.title || "Untitled Blog Post",
      description: post.metaDescription || post.description || "Explore real estate insights.",
      images: [{ url: post.image || "/default-og-image.jpg", alt: post.altText || "Hero Image" }],
      url: `${baseUrl}/insights/${category}/${slugId}`,
      type: "article",
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

  // These three paths used to render an apology at HTTP 200. Google reads that
  // as a real page with thin content — the "soft 404" bucket in Search Console —
  // and a soft 404 keeps the dead URL in the index and spends crawl budget
  // re-checking it. notFound() returns a true 404 so the URL drops out cleanly.
  if (!slugId) {
    console.error("Missing slugId parameter in URL.");
    notFound();
  }

  // The existence checks run BEFORE the try block on purpose. notFound() works by
  // throwing, so calling it inside the try would have it caught by the catch below
  // and turned straight back into a 200 "Something went wrong" page — the exact
  // soft 404 this is meant to remove. Only rendering stays guarded.
  const post: Post | null = await getPostBySlug(slugId).catch(() => null);
  if (!post) {
    notFound();
  }

  // A private article genuinely does not exist on this domain, so 404 is the
  // honest status — and it stops the same article being indexed under every
  // agent domain it is not published on.
  const canView = await canViewArticle(post);
  if (!canView) {
    notFound();
  }

  try {
    // Render MDX content on server
    const mdxContent = (
      <MDXRemote
        source={post.content}
        components={{ YouTube, MDXLink }}
        options={{ mdxOptions: { rehypePlugins: [rehypeUnwrapNestedP] } }}
      />
    );

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
