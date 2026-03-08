/**
 * Article Service Layer
 *
 * Provides CRUD operations for MongoDB Article model.
 * Bridges ArticleFormData (CMS) and Article model (Database).
 */

import Article, { type IArticle, type ArticleStatus } from '@/models/article';
import type { ArticleFormData } from '../publishing-pipeline';
import connectDB from '@/lib/mongodb';

export interface ArticleFilters {
  status?: ArticleStatus;
  category?: string;
  authorId?: string;
  featured?: boolean;
  year?: number;
  month?: number;
  tags?: string[];
  search?: string;
}

export interface ListArticlesOptions {
  filters?: ArticleFilters;
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'views' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListArticlesResult {
  articles: IArticle[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Convert ArticleFormData (CMS format) to MongoDB document
 */
export function convertFormDataToMongoDoc(
  data: ArticleFormData & { slug?: string },
  userId: string,
  userName: string,
  userEmail: string
): Partial<IArticle> {
  const now = new Date();

  return {
    title: data.title,
    slug: data.slug || generateSlugFromTitle(data.title),
    excerpt: data.excerpt,
    content: data.content,
    category: data.category as any, // Already validated in form
    tags: data.seo.keywords, // Use SEO keywords as tags
    publishedAt: now,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: data.draft ? 'draft' : 'published',
    featured: false,
    featuredImage: {
      url: data.featuredImage.url,
      publicId: data.featuredImage.publicId,
      alt: data.featuredImage.alt,
    },
    ogImage: {
      url: data.featuredImage.url,
      publicId: data.featuredImage.publicId,
    },
    seo: {
      title: data.seo.title || data.title,
      description: data.seo.description || data.excerpt,
      keywords: data.seo.keywords,
    },
    author: {
      id: userId as any,
      name: userName,
      email: userEmail,
    },
    metadata: {
      views: 0,
      readTime: calculateReadTime(data.content),
    },
  };
}

/**
 * Convert MongoDB document to ArticleFormData (CMS format)
 */
export function convertMongoDocToFormData(doc: IArticle): ArticleFormData {
  return {
    title: doc.title,
    excerpt: doc.excerpt,
    content: doc.content,
    category: doc.category,
    draft: doc.status === 'draft',
    authorId: doc.author.id.toString(),
    authorName: doc.author.name,
    featuredImage: {
      url: doc.featuredImage.url,
      publicId: doc.featuredImage.publicId,
      alt: doc.featuredImage.alt,
    },
    seo: {
      title: doc.seo.title,
      description: doc.seo.description,
      keywords: doc.seo.keywords,
    },
  };
}

/**
 * Generate URL-safe slug from title
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Calculate reading time in minutes
 */
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Create new article in database
 */
export async function createArticle(
  data: ArticleFormData,
  userId: string,
  userName: string,
  userEmail: string
): Promise<IArticle> {
  await connectDB();

  const docData = convertFormDataToMongoDoc(data, userId, userName, userEmail);
  const article = await Article.create(docData);

  console.log(`[ArticleService] Created article: ${article.slug} (${article._id})`);
  return article;
}

/**
 * Update existing article
 */
export async function updateArticle(
  slug: string,
  data: Partial<ArticleFormData>
): Promise<IArticle | null> {
  await connectDB();

  const updateData: any = {};

  if (data.title) updateData.title = data.title;
  if (data.excerpt) updateData.excerpt = data.excerpt;
  if (data.content) {
    updateData.content = data.content;
    updateData['metadata.readTime'] = calculateReadTime(data.content);
  }
  if (data.category) updateData.category = data.category;
  if (data.draft !== undefined) updateData.status = data.draft ? 'draft' : 'published';
  if (data.featuredImage) updateData.featuredImage = data.featuredImage;
  if (data.seo) updateData.seo = data.seo;

  const article = await Article.findOneAndUpdate(
    { slug },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (article) {
    console.log(`[ArticleService] Updated article: ${slug}`);
  } else {
    console.warn(`[ArticleService] Article not found: ${slug}`);
  }

  return article;
}

/**
 * Delete article by slug
 */
export async function deleteArticle(slug: string): Promise<boolean> {
  await connectDB();

  const result = await Article.deleteOne({ slug });

  if (result.deletedCount > 0) {
    console.log(`[ArticleService] Deleted article: ${slug}`);
    return true;
  } else {
    console.warn(`[ArticleService] Article not found: ${slug}`);
    return false;
  }
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(slug: string): Promise<IArticle | null> {
  await connectDB();
  return Article.findOne({ slug });
}

/**
 * Get article by ID
 */
export async function getArticleById(id: string): Promise<IArticle | null> {
  await connectDB();
  return Article.findById(id);
}

/**
 * List articles with filters and pagination
 */
export async function listArticles(
  options: ListArticlesOptions = {}
): Promise<ListArticlesResult> {
  await connectDB();

  const {
    filters = {},
    page = 1,
    limit = 10,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
  } = options;

  // Build query
  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.authorId) query['author.id'] = filters.authorId;
  if (filters.featured !== undefined) query.featured = filters.featured;
  if (filters.year) query.year = filters.year;
  if (filters.month) query.month = filters.month;
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [articles, total] = await Promise.all([
    Article.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec(),
    Article.countDocuments(query),
  ]);

  console.log(`[ArticleService] Listed ${articles.length} articles (total: ${total})`);

  return {
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Publish article (set status to published)
 */
export async function publishArticleInDB(slug: string): Promise<IArticle | null> {
  await connectDB();

  const article = await Article.findOneAndUpdate(
    { slug },
    {
      $set: {
        status: 'published',
        publishedAt: new Date(),
      },
    },
    { new: true }
  );

  if (article) {
    console.log(`[ArticleService] Published article: ${slug}`);
  }

  return article;
}

/**
 * Unpublish article (set status to draft)
 */
export async function unpublishArticleInDB(slug: string): Promise<IArticle | null> {
  await connectDB();

  const article = await Article.findOneAndUpdate(
    { slug },
    { $set: { status: 'draft' } },
    { new: true }
  );

  if (article) {
    console.log(`[ArticleService] Unpublished article: ${slug}`);
  }

  return article;
}

/**
 * Set draft status
 */
export async function setDraftStatus(
  slug: string,
  draft: boolean
): Promise<IArticle | null> {
  await connectDB();

  const status = draft ? 'draft' : 'published';
  const article = await Article.findOneAndUpdate(
    { slug },
    { $set: { status } },
    { new: true }
  );

  if (article) {
    console.log(`[ArticleService] Set draft=${draft} for article: ${slug}`);
  }

  return article;
}

/**
 * Get published articles (for /insights pages)
 */
export async function getPublishedArticles(
  filters: Partial<ArticleFilters> = {}
): Promise<IArticle[]> {
  return listArticles({
    filters: {
      ...filters,
      status: 'published',
    },
    limit: 100, // Get all published
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  }).then(result => result.articles);
}

/**
 * Check if article exists by slug
 */
export async function articleExists(slug: string): Promise<boolean> {
  await connectDB();
  const count = await Article.countDocuments({ slug });
  return count > 0;
}

/**
 * Increment article view count
 */
export async function incrementViews(slug: string): Promise<void> {
  await connectDB();
  await Article.findOneAndUpdate(
    { slug },
    {
      $inc: { 'metadata.views': 1 },
      $set: { 'metadata.lastViewed': new Date() },
    }
  );
}
