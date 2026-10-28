"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { AccountGate, CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";
import {
  CAREER_ROLES,
  findRole,
  ACCEPTED_DOC_EXT,
  ANSWER_MAX_CHARS,
  RESUME_MAX_BYTES,
  COVER_FILE_MAX_BYTES,
} from "@/config/careers";

const INCLUDED = [
  ["Your own website", "Your profile becomes a branded site on your own domain, with live MLS search."],
  ["CRM", "Contacts, inbox and follow-up in the same place as your site and your leads."],
  ["Dialer & outreach", "Call, text and campaign tools without a separate subscription."],
  ["AI market tools", "CMAs on demand, cash-flow analysis and historical market data to share with clients."],
];

function RoleCard({ slug, onApply }: { slug: string; onApply: (slug: string) => void }) {
  const t = useCompanyTheme();
  const role = findRole(slug)!;
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border ${t.isLight ? "border-gray-200" : "border-neutral-700"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left p-4 flex items-start justify-between gap-3"
      >
        <span>
          <span className={`block font-semibold ${t.heading}`}>{role.title}</span>
          <span className={`block text-sm ${t.muted}`}>
            {role.type} · {role.location}
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 mt-0.5 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${t.muted}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          <p>{role.summary}</p>
          <div>
            <p className={`font-semibold ${t.heading}`}>What you&apos;ll do</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {role.responsibilities.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <div>
            <p className={`font-semibold ${t.heading}`}>Who we&apos;re looking for</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {role.lookingFor.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => onApply(role.slug)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${t.primaryBtn}`}
          >
            Apply for this role
          </button>
        </div>
      )}
    </div>
  );
}

function ApplicationForm({ roleSlug, setRoleSlug }: { roleSlug: string; setRoleSlug: (s: string) => void }) {
  const t = useCompanyTheme();
  const { data: session } = useSession();
  const role = findRole(roleSlug);
  const [name, setName] = useState(session?.user?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const label = `block text-sm font-medium mb-1.5 ${t.heading}`;
  const field = `w-full rounded-lg border px-3 py-2 ${t.input}`;
  const fileField = `block w-full text-sm ${t.muted} file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-semibold ${
    t.isLight ? "file:bg-gray-100 file:text-gray-800" : "file:bg-neutral-800 file:text-white"
  }`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const resume = fd.get("resume") as File | null;
    const cover = fd.get("coverLetterFile") as File | null;
    if (resume && resume.size > RESUME_MAX_BYTES) return setError("Résumé must be under 3 MB.");
    if (cover && cover.size > COVER_FILE_MAX_BYTES) return setError("Cover letter file must be under 1 MB.");
    if (!String(fd.get("coverLetterText") || "").trim() && !(cover && cover.size > 0)) {
      return setError("Please write a cover letter or attach one.");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/careers/apply", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not submit your application");
      setDone(d.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`rounded-xl p-5 ${t.isLight ? "bg-emerald-50 text-emerald-800" : "bg-emerald-950/50 text-emerald-300"}`}>
        <p className="font-semibold">Application received — thank you.</p>
        <p className="mt-1 text-sm">
          We&apos;ve got your application for {done}. We read every one and will reply by email.
        </p>
        <button type="button" onClick={() => setDone(null)} className="mt-3 text-sm underline">
          Apply for another role
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={label} htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          value={roleSlug}
          onChange={(e) => setRoleSlug(e.target.value)}
          required
          className={field}
        >
          <option value="" disabled>Choose a role…</option>
          {CAREER_ROLES.map((r) => (
            <option key={r.slug} value={r.slug}>{r.title}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Full name</label>
          <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input value={session?.user?.email || ""} disabled className={`${field} opacity-70`} />
        </div>
        <div>
          <label className={label} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="linkedin">LinkedIn or portfolio</label>
          <input id="linkedin" name="linkedin" type="url" placeholder="https://" className={field} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="resume">Résumé <span className={`font-normal ${t.muted}`}>(PDF or Word, up to 3 MB)</span></label>
        <input id="resume" name="resume" type="file" accept={ACCEPTED_DOC_EXT} required className={fileField} />
      </div>

      <div>
        <label className={label} htmlFor="coverLetterText">Cover letter</label>
        <textarea
          id="coverLetterText"
          name="coverLetterText"
          rows={6}
          maxLength={10000}
          placeholder="Tell us why ChatRealty, and why you."
          className={field}
        />
        <label className={`block text-xs mt-2 mb-1 ${t.muted}`} htmlFor="coverLetterFile">…or attach one (PDF or Word, up to 1 MB)</label>
        <input id="coverLetterFile" name="coverLetterFile" type="file" accept={ACCEPTED_DOC_EXT} className={fileField} />
      </div>

      {role && (
        <fieldset className="space-y-4">
          <legend className={`text-base font-semibold ${t.heading}`}>Five questions for this role</legend>
          {role.questions.map((q, i) => (
            <div key={`${role.slug}-${q.id}`}>
              <label className={`block text-sm mb-1.5 ${t.heading}`} htmlFor={`q_${q.id}`}>
                {i + 1}. {q.prompt}
              </label>
              <textarea
                id={`q_${q.id}`}
                name={`q_${q.id}`}
                rows={4}
                required
                maxLength={ANSWER_MAX_CHARS}
                className={field}
              />
            </div>
          ))}
        </fieldset>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy || !role}
        className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}
      >
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

export default function JoinClient() {
  const t = useCompanyTheme();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const params = useSearchParams();
  const initial = params.get("role");
  const [roleSlug, setRoleSlug] = useState(initial && findRole(initial) ? initial : "");
  const applyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial && findRole(initial)) applyRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initial]);

  function applyFor(slug: string) {
    setRoleSlug(slug);
    applyRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <CompanyShell
      eyebrow="Join Us"
      title={<>Build your business here, <span className={t.accent}>or help us build it.</span></>}
      lede="ChatRealty is built by a working agent for working agents. Join as an agent to run your whole business in one place — or join the team that's building it."
    >
      <Section title="Open roles">
        <p>
          We&apos;re a small, founder-led team getting ready for our pre-seed round. Early hires shape the company —
          and share in it.
        </p>
        <div className="space-y-3">
          {CAREER_ROLES.map((r) => (
            <RoleCard key={r.slug} slug={r.slug} onApply={applyFor} />
          ))}
        </div>
      </Section>

      <div ref={applyRef} id="apply" className="scroll-mt-6">
        <Section title="Apply">
          <AccountGate action="apply for a role">
            <ApplicationForm roleSlug={roleSlug} setRoleSlug={setRoleSlug} />
          </AccountGate>
        </Section>
      </div>

      <Section title="For agents: everything in one place">
        <div className="grid gap-4 sm:grid-cols-2">
          {INCLUDED.map(([name, desc]) => (
            <div key={name} className={`rounded-xl border p-4 ${t.isLight ? "border-gray-200" : "border-neutral-700"}`}>
              <p className={`font-semibold ${t.heading}`}>{name}</p>
              <p className={`mt-1 text-sm ${t.muted}`}>{desc}</p>
            </div>
          ))}
        </div>
        <AccountGate action="join ChatRealty and start building your site">
          <p className={t.heading}>
            You&apos;re in{firstName ? `, ${firstName}` : ""}. Next, set up your site and profile.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/agent/settings" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.primaryBtn}`}>
              Set up my site
            </Link>
            <Link href="/pricing" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.secondaryBtn}`}>
              See plans
            </Link>
          </div>
        </AccountGate>
        <p className={`text-sm ${t.muted}`}>
          Want the why behind it? Read <Link href="/mission" className="underline">our mission</Link>.
        </p>
      </Section>
    </CompanyShell>
  );
}
