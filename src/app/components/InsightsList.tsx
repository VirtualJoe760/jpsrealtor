import Link from "next/link";
import Image from "next/image";

interface Post {
  slugId: string;
  title: string;
  date: string;
  image: string;
  altText: string;
  section: string;
}

interface InsightsListProps {
  posts: Post[];
  totalPages: number;
  currentPage: number;
  category: string;
}

export default function InsightsList({
  posts,
  totalPages,
  currentPage,
  category,
}: InsightsListProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div key={post.slugId} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <Link href={`/insights/${category}/${post.slugId}`}>
              <Image
                src={post.image}
                alt={post.altText}
                width={600}
                height={400}
                className="object-cover w-full h-48"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2 text-white">{post.title}</h2>
                <p className="text-sm text-gray-300">
                  {new Date(post.date).toLocaleDateString()}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-10 flex justify-center">
        {Array.from({ length: totalPages }, (_, index) => (
          <Link
            key={index + 1}
            href={`/insights/${category}?page=${index + 1}`}
            className={`mx-2 px-4 py-2 rounded ${
              currentPage === index + 1
                ? "bg-indigo-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-indigo-600"
            }`}
          >
            {index + 1}
          </Link>
        ))}
      </div>
    </section>
  );
}
