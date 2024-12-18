import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { PortableText } from "@portabletext/react";
import Image from "next/image";
import VariableHero from "@/components/VariableHero";

// Sanity query to fetch post data
const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  title,
  publishedAt,
  body,
  "mainImage": mainImage.asset->url,
  "altText": mainImage.alt
}`;

export default async function PostPage({
  params,
}: {
  params: { post: string };
}) {
  const { post } = params;

  // Fetch the single post data based on slug
  const article = await client.fetch(POST_QUERY, { slug: post });

  if (!article) {
    notFound(); // Show 404 page if post is not found
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={article.mainImage || "/default-hero.jpg"}
        heroContext={article.title}
        description={`Published on ${new Date(article.publishedAt).toLocaleDateString()}`}
        alignment="center"
      />

      {/* Article Content */}
      <article className="container mx-auto px-6 py-12 max-w-5xl text-gray-300">
        <h1 className="text-4xl font-bold text-white mb-6">
          {article.title}
        </h1>

        {/* Post Body */}
        <PortableText
          value={article.body}
          components={{
            block: {
              normal: ({ children }) => <p className="mb-4">{children}</p>,
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium mt-6 mb-3 text-gray-400">
                  {children}
                </h3>
              ),
            },
            list: {
              bullet: ({ children }) => (
                <ul className="list-disc pl-5 mb-4">{children}</ul>
              ),
              number: ({ children }) => (
                <ol className="list-decimal pl-5 mb-4">{children}</ol>
              ),
            },
            marks: {
              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              link: ({ value, children }) => (
                <a
                  href={value.href}
                  className="text-indigo-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            },
          }}
        />
      </article>
    </>
  );
}
