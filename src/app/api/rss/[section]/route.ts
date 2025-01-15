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

function getPostsBySection(section?: string) {
  console.log("Posts directory path:", postsDirectory);

  const files = fs.readdirSync(postsDirectory);
  console.log("Files in posts directory:", files);

  const posts = files
    .map((file) => {
      const filePath = path.join(postsDirectory, file);
      console.log("Reading file:", filePath);

      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);
      console.log(`Parsed frontmatter for ${file}:`, data);

      return {
        title: data.title || "Untitled",
        slugId: data.slugId || file.replace(/\.mdx?$/, ""),
        section: data.section || "general",
        description: data.metaDescription || "",
        pubDate: new Date(data.date).toUTCString(),
        link: `${baseUrl}/insights/${data.section}/${data.slugId || file.replace(/\.mdx?$/, "")}`,
        image: data.image ? `${baseUrl}${data.image}` : "",
        ogImage: data.ogImage ? `${baseUrl}${data.ogImage}` : "",
        altText: data.altText || "",
      };
    })
    .filter((post) => {
      console.log(`Filtering post: ${post.title}, section: ${post.section}`);
      return !section || section === "all" || post.section === section;
    });

  console.log("Filtered posts:", posts);

  return posts.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

export async function GET(
  request: Request,
  { params }: { params: { section: string } }
) {
  const { section } = params;

  console.log("Requested section:", section);

  const posts = getPostsBySection(section);

  if (posts.length === 0) {
    console.error("No posts found for the given section:", section);
    return new NextResponse("No posts found for the given section", { status: 404 });
  }

  const items = posts.map((post) => ({
    item: [
      { title: post.title },
      { link: post.link },
      { description: post.description },
      { pubDate: post.pubDate },
      ...(post.image
        ? [
            {
              enclosure: {
                _attr: {
                  url: post.image,
                  type: "image/png", // Adjust type if images are not PNG
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

  console.log("RSS items:", items);

  const feed = [
    {
      rss: [
        { _attr: { version: "2.0", "xmlns:media": "http://search.yahoo.com/mrss/" } },
        {
          channel: [
            { title: `Blog - ${section || "All Sections"}` },
            { link: baseUrl },
            { description: "Latest blog posts" },
            ...items,
          ],
        },
      ],
    },
  ];

  console.log("Generated RSS feed:", feed);

  return new NextResponse(xml(feed, { declaration: true }), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
