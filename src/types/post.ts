export interface PostFormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

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

  // Author (auto-applied for articles, not landing pages)
  authorId?: string;
  authorName?: string;

  // Landing page fields
  standalone?: boolean;
  heroType?: "photo" | "video";
  youtubeUrl?: string;
  videoAutoplay?: boolean;
  themeOverride?: "" | "lightgradient" | "blackspace";

  // Lead capture form
  formEnabled?: boolean;
  formHeading?: string;
  formButtonText?: string;
  formRecipients?: string;
  formFields?: PostFormField[];
}
