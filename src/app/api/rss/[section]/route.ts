import { NextResponse } from "next/server";
import xml from "xml";
import { listPublishedPosts } from "@/lib/articles/public-articles";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import { getBaseUrl } from "@/lib/domain-utils";

// The feed is read from the database, scoped to the domain's owner. It used to
// read the MDX files in src/posts/, so it lagged a publish by a GitHub commit
// plus a rebuild, and it listed every agent's articles under chatrealty.io.

function siteBaseUrl(request: Request): string {
  const host = (request.headers.get("host") || "").toLowerCase();
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return `http://${host || "localhost:3000"}`;
  }
  return getBaseUrl(host.split(":")[0]);
}

function ensureAbsoluteUrl(baseUrl: string, url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl}${url}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  const baseUrl = siteBaseUrl(request);
  const feedUrl = `${baseUrl}/api/rss/${section}`;

  const { ownerId } = await resolveDomainOwner(request);
  const { posts: rows } = await listPublishedPosts({ ownerId, category: section, limit: 100 });

  const posts = rows.map((p) => {
    const link = `${baseUrl}/insights/${p.section}/${p.slugId}`;
    return {
      title: p.title || "Untitled",
      link,
      description: p.metaDescription || p.description || "",
      pubDate: p.date ? new Date(p.date).toUTCString() : "",
      image: p.image ? ensureAbsoluteUrl(baseUrl, p.image) : "",
      altText: p.altText || "",
    };
  });

  if (posts.length === 0) {
    return new NextResponse("No posts found for the given section", { status: 404 });
  }

  const items = posts.map((post) => ({
    item: [
      { title: post.title },
      { link: post.link },
      { description: post.description },
      { pubDate: post.pubDate },
      { guid: post.link },
      ...(post.image
        ? [
            {
              enclosure: {
                _attr: {
                  url: post.image,
                  type: post.image.endsWith(".png") ? "image/png" : "image/jpeg",
                  length: "12345", // Replace with actual size if available
                },
              },
            },
          ]
        : []),
      ...(post.image
        ? [{ "media:content": { _attr: { url: post.image, medium: "image" } } }]
        : []),
      ...(post.altText ? [{ "media:description": post.altText }] : []),
    ],
  }));

  const feed = [
    {
      rss: [
        {
          _attr: {
            version: "2.0",
            "xmlns:media": "http://search.yahoo.com/mrss/",
            "xmlns:atom": "http://www.w3.org/2005/Atom",
          },
        },
        {
          channel: [
            { title: `Blog - ${section || "All Sections"}` },
            { link: baseUrl },
            {
              "atom:link": {
                _attr: {
                  href: feedUrl,
                  rel: "self",
                  type: "application/rss+xml",
                },
              },
            },
            { description: "Latest blog posts" },
            ...items,
          ],
        },
      ],
    },
  ];

  return new NextResponse(xml(feed, { declaration: true }), {
    headers: {
      "Content-Type": "application/xml",
      // Per-domain content: never let a shared cache serve one site's feed on another.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
