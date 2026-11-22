// Server side of a CMS listing blog post (/insights/listing-post/[slug]).
//
// Published posts render for everyone (private ones only on the author's
// domains, same rule as articles). Drafts render ONLY for their author — that
// is the CMS "Preview" — and are always noindex.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import User from "@/models/User";
import { doesDomainBelongToAgent, getBaseUrlFromHeaders } from "@/lib/domain-utils";
import { loadListingPostData, loadListingPostMapPins } from "@/lib/listings/listing-post";
import { toTeaser, toGated } from "@/lib/listings/listing-post-teaser";
import { resolveLeadGate, toClientConfig } from "@/lib/listings/lead-gate";
import { hasListingPostAccess } from "@/lib/listings/listing-post-access";
import { rehypeUnwrapNestedP } from "@/lib/mdx/rehype-unwrap-nested-p";
import MDXLink from "@/app/components/mdx/Link";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import ListingPostView from "./ListingPostView";

/**
 * Is this visitor already a contact of the post's author?
 *
 * Kept here rather than in listing-post-access.ts so that module stays free of
 * a Mongoose import and can be unit-tested without a database.
 */
async function findContactId(agentId: string, email: string): Promise<string | null> {
  const { default: Contact } = await import("@/models/Contact");
  const c: any = await Contact.findOne({
    userId: agentId,
    $or: [{ "emails.address": email }, { email }],
  })
    .select("_id")
    .lean();
  return c?._id ? String(c._id) : null;
}

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

export async function listingPostMetadata(slug: string, authorPreview = false): Promise<Metadata> {
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
    ...((preview || authorPreview) && { robots: { index: false, follow: false } }),
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      images: post.featuredImage?.url ? [{ url: post.featuredImage.url, alt: post.featuredImage.alt || post.title }] : [],
    },
  };
}

export default async function ListingPostPage({ slug, previewGate, authorPreview }: {
  slug: string;
  previewGate?: boolean;
  authorPreview?: boolean;
}) {
  const found = await loadPost(slug);
  if (!found) notFound();
  const { post, preview } = found;
  const lp = post.listingPost;

  const data = await loadListingPostData({ listingKey: lp.listingKey, slugAddress: lp.slugAddress }).catch((err) => {
    console.error("[listing-post] load failed:", err);
    return null;
  });

  // ---- Registration gate -------------------------------------------------
  //
  // Resolved from the POST AUTHOR's settings, never the domain owner's: a post
  // by another agent, read on this domain, follows THAT agent's gate, the same
  // way its registration lands in THAT agent's CRM.
  const authorId = String(post.author?.id || "");
  const author: any = authorId
    ? await User.findById(authorId).select("agentProfile.leadGate").lean().catch(() => null)
    : null;

  const gate = resolveLeadGate(author?.agentProfile?.leadGate, lp.gate);

  const session = await getServerSession(authOptions);
  const reviewingPublishedPost = !!authorPreview && !preview && !!authorId && String(session?.user?.id) === authorId;
  const access = gate.enabled && !reviewingPublishedPost
    ? await hasListingPostAccess({
        req: { cookies: await cookies() },
        agentId: authorId,
        slug,
        allowReturning: gate.allowReturning,
        sessionEmail: session?.user?.email || null,
        lookupContact: findContactId,
      })
    : { granted: true as const };

  // Authors can opt into the timed visitor preview without publishing.
  const unlocked = preview ? !previewGate || !gate.enabled : !gate.enabled || access.granted;

  // THE boundary. When locked, the gated half is projected away here, on the
  // server — it never reaches the client component, so removing the overlay
  // from the DOM reveals the teaser and nothing more.
  const teaser = data ? toTeaser(data, lp.videoUrl) : null;
  const full = unlocked && data ? toGated(data) : null;
  const mapData = full ? await loadListingPostMapPins(full.listing) : null;
  const listing = full?.listing || teaser?.listing || null;
  const streetAddress = teaser?.listing.unparsedFirstLineAddress || teaser?.listing.unparsedAddress.split(",")[0];
  const title = streetAddress?.trim() || post.title;
  const fullRemarks = typeof full?.listing.publicRemarks === "string" ? full.listing.publicRemarks.trim() : "";
  const previewRemarks = teaser?.listing.remarksTeaser;
  const remarks = unlocked ? fullRemarks : previewRemarks && `${previewRemarks}${teaser?.listing.remarksTruncated ? "…" : ""}`;

  const baseUrl = await getBaseUrlFromHeaders();
  const url = `${baseUrl}/insights/listing-post/${slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Insights", url: `${baseUrl}/insights` },
          { name: title, url },
        ]}
      />
      <ListingPostView
        slug={slug}
        title={title}
        description={remarks || post.excerpt}
        content={unlocked && !remarks ? (
          <MDXRemote
            source={post.content || ""}
            components={{ MDXLink }}
            options={{ mdxOptions: { rehypePlugins: [rehypeUnwrapNestedP] } }}
          />
        ) : null}
        openHouse={lp.openHouse?.date ? {
          date: lp.openHouse.date,
          startTime: lp.openHouse.startTime,
          endTime: lp.openHouse.endTime,
          notes: unlocked ? lp.openHouse.notes : undefined,
        } : null}
        agentName={post.author?.name || "the listing agent"}
        listing={listing}
        photos={
          (full?.photos || teaser?.photos) ??
          (post.featuredImage?.url ? [{ type: "photo", src: post.featuredImage.url, alt: post.title }] : [])
        }
        subdivision={full?.subdivision || null}
        city={full?.city || null}
        mapData={mapData}
        preview={preview}
        reviewingPublishedPost={reviewingPublishedPost}
        unlocked={unlocked}
        gateConfig={unlocked ? null : toClientConfig(gate)}
        videoUrl={unlocked ? lp.videoUrl || null : null}
      />
    </>
  );
}
