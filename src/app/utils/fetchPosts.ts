// src\app\utils\fetchPosts.ts

"use server";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "src/posts");

// Utility to read a file and parse frontmatter
const parsePostFile = (filePath: string): Post => {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    title: data.title || "",
    slugId: path.basename(filePath, path.extname(filePath)), // Extract slug from filename
    date: data.date || "",
    section: data.section || "",
    description: data.metaDescription || "",
    image: data.image || "",
    altText: data.altText || "",
    keywords: data.keywords || [],
    content: content || "",
  } as Post;
};

// Fetch metadata and content for a single post by its slugId
export async function getPostBySlug(slugId: string): Promise<Post> {
  const fileExtensions = [".mdx", ".md"];
  for (const extension of fileExtensions) {
    const filePath = path.join(postsDirectory, `${slugId}${extension}`);

    if (fs.existsSync(filePath)) {
      return parsePostFile(filePath);
    }
  }

  throw new Error(`Post not found: ${slugId}`);
}

// Fetch all posts and sort by date
export async function getAllPosts(): Promise<Post[]> {
  const fileNames = fs.readdirSync(postsDirectory);

  const posts = fileNames
    .filter((fileName) => /\.(md|mdx)$/.test(fileName)) // Ensure only .md or .mdx files
    .map((fileName) => parsePostFile(path.join(postsDirectory, fileName)));

  // Sort by date (newest first)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Fetch posts by section with pagination
export async function getPostsBySection(
  section: string,
  page: number = 1,
  limit: number = 5
): Promise<{ posts: Post[]; totalPages: number }> {
  const allPosts = await getAllPosts();

  const sectionPosts = allPosts.filter((post) => post.section === section);
  const totalPages = Math.ceil(sectionPosts.length / limit);
  const paginatedPosts = sectionPosts.slice((page - 1) * limit, page * limit);

  return { posts: paginatedPosts, totalPages };
}
