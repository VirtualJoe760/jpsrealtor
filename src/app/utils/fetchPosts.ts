import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "src/posts");

// Fetch metadata and content for a single post by its `slugId`
export async function getPostBySlug(slugId: string): Promise<Post> {
  const fileExtensions = [".mdx", ".md"];

  for (const extension of fileExtensions) {
    const fullPath = path.join(postsDirectory, `${slugId}${extension}`);

    if (fs.existsSync(fullPath)) {
      const fileContents = fs.readFileSync(fullPath, "utf8");

      const { data, content } = matter(fileContents);

      return {
        title: data.title,
        slug: slugId,
        date: data.date,
        section: data.section,
        description: data.metaDescription,
        image: data.image,
        altText: data.altText,
        keywords: data.keywords,
        content: content,
      } as Post;
    }
  }

  throw new Error(`Post not found: ${slugId}`);
}

// Fetch all posts (useful for generating a list of all posts)
export async function getAllPosts(): Promise<Post[]> {
  const fileNames = fs.readdirSync(postsDirectory);

  return Promise.all(
    fileNames.map(async (fileName) => {
      const slugId = fileName.replace(/\.mdx?$/, "").replace(/\.md$/, "");
      return getPostBySlug(slugId);
    })
  );
}

// Fetch posts by section with pagination support
export async function getPostsBySection(
  section: string,
  page: number = 1,
  limit: number = 5
): Promise<{ posts: Post[]; totalPages: number }> {
  const allPosts = await getAllPosts();

  const sectionPosts = allPosts.filter((post) => post.section === section);

  sectionPosts.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sectionPosts.length / limit);

  const paginatedPosts = sectionPosts.slice((page - 1) * limit, page * limit);

  return {
    posts: paginatedPosts,
    totalPages,
  };
}