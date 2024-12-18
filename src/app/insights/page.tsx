import React from "react";
import InsightsCategories from "@/components/InsightsCategories";
import VariableHero from "@/components/VariableHero";

// Generate dynamic metadata for the Insights section
export async function generateMetadata() {
  return {
    title: "Real Estate Insights - Coachella Valley",
    description:
      "Explore real estate insights, market trends, and expert advice for buying, selling, and investing in Coachella Valley. Stay informed and make confident decisions.",
    keywords: [
      "real estate insights",
      "Coachella Valley real estate",
      "home buying tips",
      "market trends",
      "property advice",
      "home selling tips",
      "real estate market analysis",
      "local market insights",
      "Coachella Valley homes",
    ],
    openGraph: {
      title: "Real Estate Insights - Coachella Valley",
      description:
        "Get expert real estate insights, local market trends, and practical advice for buyers, sellers, and investors in Coachella Valley.",
      images: [
        "https://images.unsplash.com/photo-1715559929394-4c5fdda7c50d?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      ],
      url: "https://jpsrealtor.com/insights",
    },
  };
}

const InsightsPage = () => {
  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="https://images.unsplash.com/photo-1715559929394-4c5fdda7c50d?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        heroContext="Real Estate Insights"
        description="Discover expert advice, market insights, and tips for buying, selling, and investing in Coachella Valley real estate."
      />

      {/* Insights Categories Section */}
      <InsightsCategories />
    </div>
  );
};

export default InsightsPage;
