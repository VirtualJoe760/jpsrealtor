import React from "react";
import AboutCta from "./components/AboutCta";
import BlogCta from "./components/BlogCta";
import Contact from "./components/contact/Contact";
// import ChatWidget from "./components/chat/ChatWidget";

import { getLatestPosts } from "@/utils/fetchPosts";
import VariableHeroWrapper from "./components/VariableHeroWrapper";

export default async function Home() {
  // Fetch the 3 most recent posts using getLatestPosts
  const recentPosts = await getLatestPosts(3);

  return (
    <>
      <VariableHeroWrapper />
      <AboutCta />
      <BlogCta posts={recentPosts} />
      <Contact />
      {/* <ChatWidget context="homepage" /> */}
    </>
  );
}
