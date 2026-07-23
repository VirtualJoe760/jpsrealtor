import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/chatrealty";
import { renderMarkdown, formatPostDate } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug));
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/blog" className="text-sm text-brand hover:underline">
        ← All posts
      </Link>
      <p className="mt-4 text-xs uppercase tracking-wide text-gray-400">
        {formatPostDate(post.publishedAt)}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">{post.title}</h1>
      {post.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverUrl} alt="" className="mt-6 w-full rounded-xl object-cover" />
      )}
      <div
        className="prose-basic mt-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
      />
    </article>
  );
}
