// src/app/lp/[slug]/page.tsx
// Landing page route — renders MDX posts with section "landing-page"
// at /lp/{slugId} instead of /insights/landing-page/{slugId}.
// Designed to work with custom domains pointed at individual landing pages.

import { getPostBySlug } from "@/utils/fetchPosts";
import { MDXRemote } from "next-mdx-remote/rsc";
import YouTube from "@/components/mdx/YouTube";
import MDXLink from "@/app/components/mdx/Link";
import { rehypeUnwrapNestedP } from "@/lib/mdx/rehype-unwrap-nested-p";
import LandingPageClient from "./LandingPageClient";
import { ArticleJsonLd } from "@/app/components/seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { doesDomainBelongToAgent, getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { Post } from "@/types/post";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";

const CATALINA_LEGACY_SLUG = "open-house-74229-catalina-way-palm-desert-portola-del-sol";
const CATALINA_LISTING_SLUG = "74229-catalina-way-palm-desert-ca-92260-open-house-2026-11-21-f67b4c";

async function canForwardCatalinaLink() {
  await dbConnect();
  const replacement = await Article.findOne({ slug: CATALINA_LISTING_SLUG, category: "listing-post" })
    .select("author.id status listingPost.listingKey")
    .maxTimeMS(2000)
    .lean();
  const authorId = replacement?.author?.id?.toString();
  if (!replacement?.listingPost?.listingKey || !authorId) return false;
  if (replacement.status === "published") return doesDomainBelongToAgent(authorId);
  const session = await getServerSession(authOptions);
  return session?.user?.id === authorId;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = await getBaseUrlFromHeaders();

  if (!slug) {
    return { title: "Page Not Found", description: "Content not found." };
  }

  const post = await getPostBySlug(slug).catch(() => null);

  if (!post) {
    return {
      title: "Page Not Found",
      description: "The requested page does not exist.",
    };
  }

  return {
    title: post.title || "Landing Page",
    description:
      post.metaDescription || post.description || "Learn more.",
    openGraph: {
      title: post.title || "Landing Page",
      description:
        post.metaDescription || post.description || "Learn more.",
      images: [
        {
          url: post.image || "/default-og-image.jpg",
          alt: post.altText || "Hero Image",
        },
      ],
    },
    alternates: {
      canonical: `${baseUrl}/lp/${slug}`,
    },
  };
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
        <p>Invalid URL.</p>
        <a href="/" className="text-indigo-500 hover:underline">
          Home
        </a>
      </div>
    );
  }

  if (slug === CATALINA_LEGACY_SLUG && await canForwardCatalinaLink().catch(() => false)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item !== undefined) query.append(key, item);
      }
    }
    const suffix = query.size ? `?${query}` : "";
    redirect(`/insights/listing-post/${CATALINA_LISTING_SLUG}${suffix}`);
  }

  try {
    const post = await getPostBySlug(slug).catch(() => null);

    if (!post) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
          <p>Sorry, the requested page could not be found.</p>
          <a href="/" className="text-indigo-500 hover:underline">
            Home
          </a>
        </div>
      );
    }

    // Landing pages are private to the author's domains
    const allowed = !post.authorId || await doesDomainBelongToAgent(post.authorId);
    if (!allowed) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
          <p>This page is not available on this domain.</p>
          <a href="/" className="text-indigo-500 hover:underline">
            Home
          </a>
        </div>
      );
    }

    const mdxContent = (
      <MDXRemote
        source={post.content}
        components={{ YouTube, MDXLink }}
        options={{ mdxOptions: { rehypePlugins: [rehypeUnwrapNestedP] } }}
      />
    );

    const baseUrl = await getBaseUrlFromHeaders();
    const pageUrl = `${baseUrl}/lp/${slug}`;
    const breadcrumbItems = [
      { name: "Home", url: baseUrl },
      { name: post.title, url: pageUrl },
    ];

    return (
      <>
        <ArticleJsonLd
          title={post.title}
          description={post.metaDescription || post.description || ""}
          url={pageUrl}
          image={post.image}
          datePublished={post.date}
          section="landing-page"
        />
        <BreadcrumbJsonLd items={breadcrumbItems} />
        <LandingPageClient
          post={post}
          mdxContent={mdxContent}
        />
      </>
    );
  } catch (error) {
    console.error("Error rendering landing page:", error);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-white">
        <p>Something went wrong while loading the page.</p>
        <a href="/" className="text-indigo-500 hover:underline">
          Home
        </a>
      </div>
    );
  }
}
