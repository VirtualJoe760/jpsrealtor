import type { Metadata } from "next";
import AiClassesClient from "./AiClassesClient";

export const metadata: Metadata = {
  title: { absolute: "AI Classes for Brokerages | ChatRealty" },
  description:
    "Book an in-office AI class for your agents: Claude Code, AI content creation tools, and ChatRealty.",
};

export default function AiClassesPage() {
  return <AiClassesClient />;
}
