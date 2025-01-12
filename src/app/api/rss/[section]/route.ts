import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import xml from "xml";

// Adjust the path to point to src/posts
const postsDirectory = path.join(process.cwd(), "src", "posts");

// Detect the base URL
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
            section: data.section || "general",
            description: data.metaDescription || "",
            pubDate: new Date(data.date).toUTCString(),
            link: `${baseUrl}/insights/${data.section}/${file.replace(/\.mdx?$/, "")}`, // Updated link to include section
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
    

export async function GET(request: Request, { params }: { params: { section: string } }) {
  const { section } = params;

  // Log the requested section
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
    ],
  }));

  console.log("RSS items:", items);

  const feed = [
    {
      rss: [
        { _attr: { version: "2.0" } },
        {
          channel: [
            { title: `Blog - ${section || "All Sections"}` },
            { link: baseUrl }, // Now baseUrl is globally available
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
