import AboutCta from "./components/AboutCta";
import BlogCta from "./components/BlogCta";
import Contact from "./components/contact/Contact";
import VariableHero from "./components/VariableHero";
import { getLatestPosts } from "@/utils/fetchPosts";

export default async function Home() {
  // Fetch the 3 most recent posts using getLatestPosts
  const recentPosts = await getLatestPosts(3);

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
