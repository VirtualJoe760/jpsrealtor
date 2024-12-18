import Link from "next/link";
import Image from "next/image";
import { type SanityDocument } from "next-sanity";
import { client } from "@/sanity/lib/client";
import VariableHero from "../components/VariableHero";

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  publishedAt,
  "thumbnail": mainImage.asset->url,
  "altText": mainImage.alt
}`;

const options = { next: { revalidate: 30 } };

export default async function IndexPage() {
  const articles = await client.fetch<SanityDocument[]>(POSTS_QUERY, {}, options);

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/city-images/cathedral-city.jpg"
        heroContext="JPS Insights"
        description="Read the latest on my local tips about buying, selling & The Coachella Valley."
        alignment="center"
      />

      {/* Articles Section */}
      <main className="container mx-auto min-h-screen max-w-6xl p-8">
        <h1 className="text-4xl font-bold mb-10 text-white text-center">Articles</h1>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article._id} href={`/insights/${article.slug.current}`}>
              <div className="group rounded-lg overflow-hidden bg-gray-900 hover:shadow-lg transition-shadow">
                {/* Thumbnail using Next.js Image */}
                {article.thumbnail && (
                  <div className="relative h-56 w-full">
                    <Image
                      src={article.thumbnail}
                      alt={article.altText || article.title}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-105"
                      priority={false} // Lazy loads images not in the viewport
                    />
                  </div>
                )}

                {/* Article Content */}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-white group-hover:text-gray-300">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
