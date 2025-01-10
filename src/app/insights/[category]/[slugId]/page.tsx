import { getPostBySlug } from "@/utils/fetchPosts";
import VariableHero from "@/components/VariableHero";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import { Post } from "@/types/post";
import Contact from "@/app/components/contact/Contact";

// Dynamic metadata generation
export async function generateMetadata({
  params,
}: {
  params: { category: string; slugId: string };
}) {
  const { slugId } = params; // Destructure params directly

  if (!slugId) {
    console.error("Missing slugId for metadata.");
    return { title: "Post Not Found", description: "Content not found." };
  }

  const post = await getPostBySlug(slugId).catch(() => null);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post does not exist.",
    };
  }

  return {
    title: post.title || "Untitled Blog Post",
    description: post.metaDescription || post.description || "Explore real estate insights.",
    openGraph: {
      title: post.title || "Untitled Blog Post",
      description: post.metaDescription || post.description || "Explore real estate insights.",
      images: [{ url: post.image || "/default-og-image.jpg", alt: post.altText || "Hero Image" }],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: { category: string; slugId: string };
}) {
  const { slugId } = params; // Destructure params directly

  if (!slugId) {
    console.error("Missing slugId parameter in URL.");
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
        <p>Invalid URL: Missing content identifier.</p>
        <a href="/insights" className="text-indigo-500 hover:underline">
          Back to Insights
        </a>
      </div>
    );
  }

  try {
    // Fetch the post data
    const post: Post | null = await getPostBySlug(slugId).catch(() => null);

    if (!post) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
          <p>Sorry, the requested post could not be found.</p>
          <a href="/insights" className="text-indigo-500 hover:underline">
            Back to Insights
          </a>
        </div>
      );
    }

    return (
      <div className="bg-black text-white">
        {/* Hero Section */}
        <VariableHero
          backgroundImage={post.image || "/default-hero-image.jpg"}
          heroContext={post.title || "Untitled Post"}
          description={`Published on: ${new Date(post.date).toLocaleDateString()}`}
        />

        {/* Blog Content */}
        <section className="mx-5 2xl:px-[30%] lg:px-40 my-10 py-10 px-2">
          <article className="prose prose-invert max-w-none prose-h1:text-white prose-h2:text-white prose-p:text-gray-200 prose-a:text-indigo-400 hover:prose-a:text-indigo-600 prose-strong:text-gray-200">
            {/* Markdown Rendering */}
            <ReactMarkdown rehypePlugins={[rehypeSlug]}>{post.content}</ReactMarkdown>
            <hr />
          </article>
        </section>

        {/* Call-to-Action */}
        <Contact />
      </div>
    );
  } catch (error) {
    console.error("Error rendering post:", error);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
        <p>Something went wrong while loading the post.</p>
        <a href="/insights" className="text-indigo-500 hover:underline">
          Back to Insights
        </a>
      </div>
    );
  }
}
