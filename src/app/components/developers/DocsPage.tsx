// src/app/components/developers/DocsPage.tsx
//
// Lightweight presentational helpers shared across the /developers reference
// pages — a page header and a section heading. Server components.

import type { ReactNode } from "react";

export function DocsHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {intro && (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {intro}
        </p>
      )}
    </header>
  );
}

export function DocsSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_strong]:text-foreground">
      {children}
    </div>
  );
}
