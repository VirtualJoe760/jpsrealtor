export interface Post {
  title: string;
  slug: string;
  slugId: string;
  date: string;
  section: string;
  description?: string;
  metaDescription?: string;
  image?: string;
  altText?: string;
  keywords?: string[];
  content: string;
}
