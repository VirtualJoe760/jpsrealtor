// src/app/components/developers/Callout.tsx
//
// A highlighted note/warning box for the /developers reference docs. Server
// component. Variants tint via semantic + a small accent border so they read
// in both the light and dark themes.

import type { ReactNode } from "react";

type CalloutVariant = "info" | "warning" | "required";

const VARIANT_STYLES: Record<
  CalloutVariant,
  { border: string; badge: string; defaultLabel: string }
> = {
  info: {
    border: "border-l-blue-500",
    badge: "text-blue-600 dark:text-blue-400",
    defaultLabel: "Note",
  },
  warning: {
    border: "border-l-amber-500",
    badge: "text-amber-600 dark:text-amber-400",
    defaultLabel: "Heads up",
  },
  required: {
    border: "border-l-red-500",
    badge: "text-red-600 dark:text-red-400",
    defaultLabel: "Required",
  },
};

type CalloutProps = {
  variant?: CalloutVariant;
  /** Override the badge label (defaults per variant). */
  title?: string;
  children: ReactNode;
};

export default function Callout({ variant = "info", title, children }: CalloutProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      className={`my-4 rounded-r-lg border border-l-4 border-border bg-muted/30 px-4 py-3 ${styles.border}`}
    >
      <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
        {title || styles.defaultLabel}
      </div>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}
