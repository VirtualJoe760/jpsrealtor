import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import xml from "xml";

const postsDirectory = path.join(process.cwd(), "src", "posts");

const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://www.jpsrealtor.com"
    : "http://localhost:3000";

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url; // It's already an absolute URL
  }
  return `${baseUrl}${url}`; // Prepend baseUrl for relative URLs
}

function getPostsBySection(section?: string) {
  const files = fs.readdirSync(postsDirectory);

  const posts = files
    .map((file) => {
      const fileContents = fs.readFileSync(path.join(postsDirectory, file), "utf8");
      const { data } = matter(fileContents);

      return {
        title: data.title || "Untitled",
        slugId: data.slugId || file.replace(/\.mdx?$/, ""),
        section: data.section || "general",
        description: data.metaDescription || "",
        pubDate: new Date(data.date).toUTCString(),
        link: `${baseUrl}/insights/${data.section}/${data.slugId || file.replace(/\.mdx?$/, "")}`,
        image: data.image ? ensureAbsoluteUrl(data.image) : "",
        ogImage: data.ogImage ? ensureAbsoluteUrl(data.ogImage) : "",
        altText: data.altText || "",
      };
    })
    .filter((post) => !section || section === "all" || post.section === section)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return posts;
}

export async function GET(
  request: Request,
  { params }: { params: { section: string } }
) {
  const { section } = params;
  const feedUrl = `${baseUrl}/api/rss/${section}`;

  const posts = getPostsBySection(section);

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
      ...(post.ogImage
        ? [{ "media:content": { _attr: { url: post.ogImage, medium: "image" } } }]
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
    },
  });
}
