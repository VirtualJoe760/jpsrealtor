"use server";

// Article reads for pages. The database is the only source — the MDX files in
// src/posts/ are no longer read anywhere (see src/lib/articles/public-articles.ts
// for why).

import { Post } from "@/types/post";
import { getArticlePost, listPublishedPosts } from "@/lib/articles/public-articles";

// Fetch metadata and content for a single post by its slugId
export async function getPostBySlug(slugId: string): Promise<Post> {
  const post = await getArticlePost(slugId);
  if (!post) throw new Error(`Post not found: ${slugId}`);
  return post;
}

// Fetch one owner's published posts in a section, with pagination
export async function getPostsBySection(
  section: string,
  page: number = 1,
  limit: number = 5,
  ownerId: string | null = null
): Promise<{ posts: Post[]; totalPages: number }> {
  const { posts, total } = await listPublishedPosts({
    ownerId,
    category: section,
    page,
    limit,
  });
  return { posts, totalPages: Math.ceil(total / limit) };
}
