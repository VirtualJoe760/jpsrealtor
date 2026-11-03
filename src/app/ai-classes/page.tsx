import type { Metadata } from "next";
import AiClassesClient from "./AiClassesClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.chatrealty.io/ai-classes" },
  title: { absolute: "AI Classes for Brokerages | ChatRealty" },
  description:
    "Book an in-office AI class for your agents: Claude Code and Codex, AI content creation tools, and ChatRealty.",
};

export default function AiClassesPage() {
  return <AiClassesClient />;
}
