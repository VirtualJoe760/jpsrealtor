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
import { isOwnerDomain } from "@/lib/domain-utils";
import { Post } from "@/types/post";

/**
 * Check if the current domain is allowed to view this landing page.
 * Landing pages are always private to the author's domains.
 */
async function canViewLandingPage(post: Post): Promise<boolean> {
  if (!post.authorId) return true; // Legacy posts without authorId

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  // Owner domains (jpsrealtor.com) always have access
  if (isOwnerDomain(hostname)) return true;

  // Extract subdomain
  let subdomain: string | undefined;
  if (hostname.includes("chatrealty")) {
    const parts = hostname.split("chatrealty")[0]?.replace(/\.$/, "");
    subdomain = parts?.split(".").filter(s => s && s !== "www").pop();
  } else if (hostname.endsWith(".localhost")) {
    const sub = hostname.split(".localhost")[0];
    if (sub && sub !== "www") subdomain = sub;
  }

  // Check if subdomain's agent matches the post author
  if (subdomain) {
    try {
      const dbConnect = (await import("@/lib/mongoose")).default;
      await dbConnect();
      const mongoose = await import("mongoose");
      const db = mongoose.default.connection.db;
      if (db) {
        const agent = await db.collection("users").findOne(
          { "agentProfile.subdomain": subdomain },
          { projection: { _id: 1 } }
        );
        if (agent && agent._id.toString() === post.authorId) return true;
      }
    } catch { /* non-blocking */ }
    return false;
  }

  // Custom domains — check DomainRegistry
  try {
    const dbConnect = (await import("@/lib/mongoose")).default;
    await dbConnect();
    const mongoose = await import("mongoose");
    const db = mongoose.default.connection.db;
    if (db) {
      const domainEntry = await db.collection("domainregistries").findOne(
        { domain: hostname, status: "active" },
        { projection: { ownerId: 1 } }
      );
      if (domainEntry && domainEntry.ownerId?.toString() === post.authorId) return true;
    }
  } catch { /* non-blocking */ }

  return false;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
      canonical: `https://jpsrealtor.com/lp/${slug}`,
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
    const allowed = await canViewLandingPage(post);
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

    const pageUrl = `https://jpsrealtor.com/lp/${slug}`;
    const breadcrumbItems = [
      { name: "Home", url: "https://jpsrealtor.com" },
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
