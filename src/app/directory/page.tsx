import { Metadata } from "next";
import DirectoryClient from "./DirectoryClient";

export const metadata: Metadata = {
  title: "Agent Directory | Find Your Local Real Estate Expert | ChatRealty",
  description:
    "Browse our network of verified real estate agents. Find a local expert by city, specialization, or name. ChatRealty connects you with the right agent for your needs.",
  keywords: [
    "real estate agents",
    "find a realtor",
    "agent directory",
    "local real estate expert",
    "ChatRealty agents",
  ],
  openGraph: {
    title: "Agent Directory | Find Your Local Real Estate Expert",
    description:
      "Browse our network of verified real estate agents. Find a local expert by city, specialization, or name.",
    type: "website",
    url: "https://chatrealty.io/directory",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Directory | Find Your Local Real Estate Expert",
    description:
      "Browse our network of verified real estate agents. Find a local expert by city, specialization, or name.",
  },
};

export default function DirectoryPage() {
  return <DirectoryClient />;
}
