"use client";

// AI classes taught in person at brokerage offices — part of ChatRealty's
// sales motion. A broker or office manager picks a time here and it lands on
// the founder's Google Calendar through the same public booking pipeline as
// /book-appointment and /invest (see AiClassBooker).

import { Bot, Clapperboard, MapPin, MessageSquare } from "lucide-react";
import { CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";
import AiClassBooker from "./AiClassBooker";
import { AI_CLASS_LEAD_DAYS } from "@/config/ai-classes";

const TOPICS = [
  {
    icon: Bot,
    title: "Claude Code / Codex",
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
      eyebrow="AI Classes · In Person · Southern California"
      title={<>Bring an AI class <span className={t.accent}>to your office.</span></>}
      lede="A hands-on, in-person session for your agents, taught at your brokerage. Everyone leaves knowing how to put AI to work in their business that week."
    >
      <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${t.card} ${t.body}`}>
        <MapPin className={`w-5 h-5 shrink-0 ${t.accent}`} />
        <p>
          Classes are taught <strong className={t.heading}>in person</strong> at your office, currently in{" "}
          <strong className={t.heading}>Southern California</strong> only.
        </p>
      </div>

      <Section title="Every class covers">
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
        <p>
          Tell us about your office and presentation room, then pick a day at least {AI_CLASS_LEAD_DAYS} days out.
          You&apos;ll get a calendar invite, and we&apos;ll confirm the setup before the class.
        </p>
        <AiClassBooker />
      </Section>
    </CompanyShell>
  );
}
