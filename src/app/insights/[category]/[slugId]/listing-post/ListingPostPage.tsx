// Server side of a CMS listing blog post (/insights/listing-post/[slug]).
//
// Published posts render for everyone (private ones only on the author's
// domains, same rule as articles). Drafts render ONLY for their author — that
// is the CMS "Preview" — and are always noindex.

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { doesDomainBelongToAgent, getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { loadListingPostData } from "@/lib/listings/listing-post";
import { rehypeUnwrapNestedP } from "@/lib/mdx/rehype-unwrap-nested-p";
import MDXLink from "@/app/components/mdx/Link";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import ListingPostView from "./ListingPostView";

async function loadPost(slug: string): Promise<{ post: any; preview: boolean } | null> {
  await dbConnect();
  const post: any = await Article.findOne({ slug, category: "listing-post" }).lean();
  if (!post?.listingPost?.listingKey) return null;

  if (post.status !== "published") {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || String(session.user.id) !== String(post.author?.id)) return null;
    return { post, preview: true };
  }
  if (post.visibility === "private" && !(await doesDomainBelongToAgent(String(post.author?.id)))) return null;
  return { post, preview: false };
}

export async function listingPostMetadata(slug: string): Promise<Metadata> {
  const found = await loadPost(slug).catch(() => null);
  if (!found) return { title: "Post Not Found", robots: { index: false, follow: false } };
  const { post, preview } = found;
  const baseUrl = await getBaseUrlFromHeaders();
  const url = `${baseUrl}/insights/listing-post/${slug}`;
  const description = post.seo?.description || post.excerpt;
  return {
    title: post.seo?.title || post.title,
    description,
    alternates: { canonical: url },
    ...(preview && { robots: { index: false, follow: false } }),
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      images: post.featuredImage?.url ? [{ url: post.featuredImage.url, alt: post.featuredImage.alt || post.title }] : [],
    },
  };
}

export default async function ListingPostPage({ slug }: { slug: string }) {
  const found = await loadPost(slug);
  if (!found) notFound();
  const { post, preview } = found;
  const lp = post.listingPost;

  const data = await loadListingPostData({ listingKey: lp.listingKey, slugAddress: lp.slugAddress }).catch((err) => {
    console.error("[listing-post] load failed:", err);
    return null;
  });

  const baseUrl = await getBaseUrlFromHeaders();
  const url = `${baseUrl}/insights/listing-post/${slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Insights", url: `${baseUrl}/insights` },
          { name: post.title, url },
        ]}
      />
      <ListingPostView
        slug={slug}
        title={post.title}
        excerpt={post.excerpt}
        content={
          <MDXRemote
            source={post.content || ""}
            components={{ MDXLink }}
            options={{ mdxOptions: { rehypePlugins: [rehypeUnwrapNestedP] } }}
          />
        }
        postType={lp.postType === "open-house" ? "open-house" : "listing"}
        openHouse={lp.openHouse || null}
        agentName={post.author?.name || "the listing agent"}
        listing={data?.listing || null}
        photos={data?.photos || (post.featuredImage?.url ? [{ type: "photo", src: post.featuredImage.url, alt: post.title }] : [])}
        subdivision={data?.subdivision || null}
        city={data?.city || null}
        preview={preview}
      />
    </>
  );
}
