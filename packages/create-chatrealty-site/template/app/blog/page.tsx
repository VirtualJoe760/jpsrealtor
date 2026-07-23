import Link from "next/link";
import { getPosts } from "@/lib/chatrealty";
import { formatPostDate } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blog" };

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">From the blog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Market insights and local know-how, straight from your agent.
      </p>

      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-gray-500">
          No posts yet — new articles published in the ChatRealty CMS appear here automatically.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slugId}
              href={`/blog/${encodeURIComponent(p.slugId)}`}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {p.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {formatPostDate(p.publishedAt)}
                </p>
                <h2 className="mt-1 font-semibold text-gray-900 group-hover:text-brand">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{p.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
