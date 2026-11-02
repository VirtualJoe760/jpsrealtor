"use client";

// AI classes taught in person at brokerage offices — part of ChatRealty's
// sales motion. A broker or office manager picks a time here and it lands on
// the founder's Google Calendar through the same public booking pipeline as
// /book-appointment and /invest (see AiClassBooker).

import { Bot, Clapperboard, MessageSquare } from "lucide-react";
import { CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";
import AiClassBooker from "./AiClassBooker";

const TOPICS = [
  {
    icon: Bot,
    title: "Claude Code",
    desc: "Use an AI assistant to build and run your own tools: websites, reports and automations, without being a programmer.",
  },
  {
    icon: Clapperboard,
    title: "AI content creation",
    desc: "Listing carousels, videos, articles and social posts made with AI, and how to stay MLS-compliant doing it.",
  },
  {
    icon: MessageSquare,
    title: "ChatRealty",
    desc: "AI property search, on-demand CMAs, cash-flow analysis, your own agent website and CRM, all on one platform.",
  },
];

export default function AiClassesClient() {
  const t = useCompanyTheme();
  const card = `rounded-xl border p-4 ${t.isLight ? "border-gray-200" : "border-neutral-700"}`;

  return (
    <CompanyShell
      eyebrow="AI Classes · For Brokerages"
      title={<>Bring an AI class <span className={t.accent}>to your office.</span></>}
      lede="A hands-on session for your agents, taught at your brokerage. Everyone leaves knowing how to put AI to work in their business that week."
    >
      <Section title="What we cover">
        <div className="grid gap-3 sm:grid-cols-3">
          {TOPICS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={card}>
              <Icon className={`w-5 h-5 ${t.accent}`} />
              <p className={`mt-2 font-semibold ${t.heading}`}>{title}</p>
              <p className={`mt-1 text-sm ${t.muted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Schedule a class">
        <p>Pick a day and a start time. You&apos;ll get a calendar invite, and we&apos;ll follow up to plan the details.</p>
        <AiClassBooker />
      </Section>
    </CompanyShell>
  );
}
