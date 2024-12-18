import AboutCta from "./components/AboutCta";
import BlogCta from "./components/BlogCta";
import Contact from "./components/contact/Contact";
import VariableHero from "./components/VariableHero";
import { getAllPosts } from "@/utils/fetchPosts";

export default async function Home() {
  // Fetch posts on the server
  const posts = await getAllPosts();

  // Limit to 3 most recent posts
  const recentPosts = posts.slice(0, 3);

  return (
    <>
      <VariableHero
        backgroundImage={`/joey/home.png`}
        heroContext=" "
        description=""
        alignment="right"
      />
      <AboutCta />
      {/* Pass posts to BlogCta */}
      <BlogCta posts={recentPosts} />
      <Contact />
    </>
  );
}
