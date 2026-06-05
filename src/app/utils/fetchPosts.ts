"use server";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post } from "@/types/post";
import { IS_PRODUCTION } from "@/lib/environment";

const postsDirectory = path.join(process.cwd(), "src/posts");

/**
 * Load a single post from MongoDB by slug.
 * Used in production where MDX files may not have the latest data.
 */
async function getPostFromDB(slugId: string): Promise<Post | null> {
  try {
    const connectDB = (await import("@/lib/mongodb")).default;
    await connectDB();
    const Article = (await import("@/models/article")).default;
    const doc = await Article.findOne({ slug: slugId }).lean();
    if (!doc) return null;

    return {
      title: doc.title || "",
      slugId: doc.slug,
      slug: doc.slug,
      date: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : "",
      section: doc.category || "",
      description: doc.excerpt || "",
      metaDescription: doc.seo?.description || doc.excerpt || "",
      image: doc.featuredImage?.url || "",
      altText: doc.featuredImage?.alt || "",
      keywords: doc.seo?.keywords || doc.tags || [],
      content: doc.content || "",
      authorId: doc.author?.id?.toString(),
      authorName: doc.author?.name,
      visibility: doc.visibility || "private",
      // Landing page fields
      ...(doc.standalone !== undefined && { standalone: doc.standalone }),
      ...(doc.heroType && { heroType: doc.heroType }),
      ...(doc.youtubeUrl && { youtubeUrl: doc.youtubeUrl }),
      ...(doc.videoAutoplay !== undefined && { videoAutoplay: doc.videoAutoplay }),
      ...(doc.themeOverride && { themeOverride: doc.themeOverride }),
      ...(doc.formEnabled !== undefined && { formEnabled: doc.formEnabled }),
      ...(doc.formHeading && { formHeading: doc.formHeading }),
      ...(doc.formButtonText && { formButtonText: doc.formButtonText }),
      ...(doc.formRecipients && { formRecipients: doc.formRecipients }),
      ...(doc.formDisclaimer && { formDisclaimer: doc.formDisclaimer }),
      ...(doc.formFields && {
        formFields: (doc.formFields as any[]).map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options ? Array.from(f.options) : [],
        })),
      }),
    } as Post;
  } catch (err) {
    console.error("[fetchPosts] MongoDB lookup failed:", err);
    return null;
  }
}

// Utility to read a file and parse frontmatter
const parsePostFile = (filePath: string): Post => {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  // Normalize date to ISO format for consistency
  const normalizedDate = new Date(data.date).toISOString();

  return {
    title: data.title || "",
    slugId: path.basename(filePath, path.extname(filePath)), // Extract slug from filename
    date: normalizedDate || "",
    section: data.section || "",
    description: data.metaDescription || "",
    image: data.image || "",
    altText: data.altText || "",
    keywords: data.keywords || [],
    content: content || "",

    // Author
    ...(data.authorId && { authorId: data.authorId }),
    ...(data.authorName && { authorName: data.authorName }),

    // Visibility
    ...(data.visibility && { visibility: data.visibility }),

    // Landing page fields
    ...(data.standalone !== undefined && { standalone: data.standalone }),
    ...(data.heroType && { heroType: data.heroType }),
    ...(data.youtubeUrl && { youtubeUrl: data.youtubeUrl }),
    ...(data.videoAutoplay !== undefined && { videoAutoplay: data.videoAutoplay }),
    ...(data.themeOverride && { themeOverride: data.themeOverride }),

    // Lead capture form
    ...(data.formEnabled && { formEnabled: data.formEnabled }),
    ...(data.formHeading && { formHeading: data.formHeading }),
    ...(data.formButtonText && { formButtonText: data.formButtonText }),
    ...(data.formRecipients && { formRecipients: data.formRecipients }),
    ...(data.formDisclaimer && { formDisclaimer: data.formDisclaimer }),
    ...(data.formFields && { formFields: data.formFields }),
  } as Post;
};

// Fetch metadata and content for a single post by its slugId
export async function getPostBySlug(slugId: string): Promise<Post> {
  // Production: try MongoDB first (has latest data including LP fields)
  if (IS_PRODUCTION) {
    const dbPost = await getPostFromDB(slugId);
    if (dbPost) return dbPost;
  }

  // Localhost (or MongoDB miss): read from MDX file
  const fileExtensions = [".mdx", ".md"];
  for (const extension of fileExtensions) {
    const filePath = path.join(postsDirectory, `${slugId}${extension}`);

    if (fs.existsSync(filePath)) {
      return parsePostFile(filePath);
    }
  }

  // Last resort on production: try MongoDB even if IS_PRODUCTION was false
  if (!IS_PRODUCTION) {
    const dbPost = await getPostFromDB(slugId);
    if (dbPost) return dbPost;
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

// Fetch the latest posts (newest first, limit results)
export async function getLatestPosts(limit: number = 3): Promise<Post[]> {
  const allPosts = await getAllPosts(); // Fetch all posts
  return allPosts.slice(0, limit); // Return the top `limit` posts
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
