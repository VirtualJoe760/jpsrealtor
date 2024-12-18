import { getPostBySlug } from "@/utils/fetchPosts";
import { Post } from "@/types/post";
import VariableHero from "@/components/VariableHero";
import { remark } from "remark";
import html from "remark-html";

// Metadata generation for SEO
export async function generateMetadata({
  params,
}: {
  params: { category: string; slugId: string };
}) {
  try {
    const { slugId } = params;

    if (!slugId) {
      console.error("Slug ID is missing in params:", params);
      return {
        title: "Post Not Found",
        description: "The requested post could not be found.",
      };
    }

    const post: Post = await getPostBySlug(slugId);

    if (!post) {
      return {
        title: "Post Not Found",
        description: "The requested post could not be found.",
      };
    }

    return {
      title: `${post.title} - Real Estate Insights`,
      description: post.description || post.metaDescription,
      keywords: post.keywords?.join(", "),
      openGraph: {
        title: post.title,
        description: post.description || post.metaDescription,
        url: `https://your-domain.com/insights/${params.category}/${slugId}`,
        images: [
          {
            url: post.image,
            alt: post.altText,
          },
        ],
      },
    };
  } catch (error) {
    console.error("Error in metadata generation:", error);
    return {
      title: "Post Not Found",
      description: "The requested post could not be found.",
    };
  }
}

export default async function PostPage({
  params,
}: {
  params: { category: string; slugId: string };
}) {
  const { slugId } = params;

  if (!slugId) {
    console.error("Slug ID is missing.");
    return <p>Slug ID is missing</p>;
  }

  try {
    const post: Post = await getPostBySlug(slugId);

    if (!post) {
      return (
        <div className="bg-black text-white min-h-screen flex flex-col justify-center items-center">
          <p>Post not found</p>
          <a href="/insights" className="text-indigo-500 hover:underline">
            Back to Insights
          </a>
        </div>
      );
    }

    const processedContent = await remark().use(html).process(post.content);
    const contentHtml = processedContent.toString();

    return (
      <div className="bg-black text-white">
        <VariableHero
          backgroundImage={post.image}
          heroContext={post.title}
          description={`Published on: ${new Date(post.date).toLocaleDateString()}`}
        />

        <section className="mx-5 2xl:px-80 lg:px-40 my-10 py-10 px-2">
          <div
            className="post-content prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </section>
      </div>
    );
  } catch (error) {
    console.error("Error fetching post:", error);
    return (
      <div className="bg-black text-white min-h-screen flex flex-col justify-center items-center">
        <p>There was an error loading the post.</p>
      </div>
    );
  }
}
