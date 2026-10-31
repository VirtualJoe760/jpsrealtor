// src/app/campaign/[slug]/page.tsx
// Renders landing pages created via the CMS with category "landing-page".
// These pages have a clean, conversion-focused layout — no sidebar or blog chrome.

import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Article from "@/models/article";
import { Metadata } from "next";
import CampaignPageClient from "./CampaignPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Published landing pages only, from the database. Until 2026-10-29 this read
// the MDX files in src/posts/, so a landing page appeared only after a GitHub
// commit and a rebuild.
async function getLandingPage(slug: string) {
  await connectDB();
  const doc: any = await Article.findOne({
    slug,
    category: "landing-page",
    status: "published",
  }).lean();
  if (!doc) return null;

  const image = doc.featuredImage?.url || "";
  return {
    title: doc.title || "",
    excerpt: doc.excerpt || "",
    content: doc.content || "",
    image,
    metaTitle: doc.seo?.title || doc.title || "",
    metaDescription: doc.seo?.description || doc.excerpt || "",
    ogImage: image,
    keywords: doc.seo?.keywords || doc.tags || [],
    date: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : "",
    standalone: doc.standalone || false,
    heroType: doc.heroType || "photo",
    youtubeUrl: doc.youtubeUrl || "",
    videoAutoplay: doc.videoAutoplay !== false,
    formEnabled: doc.formEnabled || false,
    formHeading: doc.formHeading || "Get Started",
    formFields: (doc.formFields || []).map((f: any) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options ? Array.from(f.options) : [],
    })),
    formRecipients: doc.formRecipients || "",
    formButtonText: doc.formButtonText || "Submit",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) return { title: "Page Not Found" };

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      images: page.ogImage ? [page.ogImage] : [],
    },
  };
}

export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) {
    notFound();
  }

  return <CampaignPageClient page={page} />;
}
