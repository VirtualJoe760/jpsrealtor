// src/app/lp/[slug]/page.tsx
// Landing page route — renders MDX posts with section "landing-page"
// at /lp/{slugId} instead of /insights/landing-page/{slugId}.
// Designed to work with custom domains pointed at individual landing pages.

import { getPostBySlug } from "@/utils/fetchPosts";
import { MDXRemote } from "next-mdx-remote/rsc";
import YouTube from "@/components/mdx/YouTube";
import MDXLink from "@/app/components/mdx/Link";
import LandingPageClient from "./LandingPageClient";
import { ArticleJsonLd } from "@/app/components/seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import { headers } from "next/headers";
import { doesDomainBelongToAgent, getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { Post } from "@/types/post";

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
}: {
  params: Promise<{ slug: string }>;
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
      <MDXRemote source={post.content} components={{ YouTube, MDXLink }} />
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
