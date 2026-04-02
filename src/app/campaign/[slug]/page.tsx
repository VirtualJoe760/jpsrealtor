// src/app/campaign/[slug]/page.tsx
// Renders landing pages created via the CMS with category "landing-page".
// These pages have a clean, conversion-focused layout — no sidebar or blog chrome.

import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Metadata } from "next";
import CampaignPageClient from "./CampaignPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getLandingPage(slug: string) {
  // Try loading from MDX files (localhost)
  const postsDir = path.join(process.cwd(), "src/posts");

  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = path.join(postsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, content: mdxContent } = matter(content);

      if (data.slugId === slug && data.section === "landing-page") {
        return {
          title: data.title || "",
          excerpt: data.metaDescription || "",
          content: mdxContent,
          image: data.image || data.ogImage || "",
          metaTitle: data.metaTitle || data.title || "",
          metaDescription: data.metaDescription || "",
          ogImage: data.ogImage || data.image || "",
          keywords: data.keywords || [],
          date: data.date || "",
          standalone: data.standalone || false,
          heroType: data.heroType || "photo",
          youtubeUrl: data.youtubeUrl || "",
          videoAutoplay: data.videoAutoplay !== false,
          formEnabled: data.formEnabled || false,
          formHeading: data.formHeading || "Get Started",
          formFields: data.formFields || [],
          formRecipients: data.formRecipients || "",
          formButtonText: data.formButtonText || "Submit",
        };
      }
    }
  }

  return null;
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
