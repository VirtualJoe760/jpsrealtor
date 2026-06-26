"use client";

// src/app/components/developers/CodeBlock.tsx
//
// Monospace code block with a copy-to-clipboard button, for the /developers
// reference docs. Dependency-free (no syntax-highlight lib) — themed via the
// app's semantic Tailwind tokens so it tracks light/dark automatically.

import { useState } from "react";

type CodeBlockProps = {
  /** The raw code/text to render (preserved verbatim, including newlines). */
  code: string;
  /** Optional language label shown in the header (e.g. "bash", "json"). */
  language?: string;
  /** Optional caption shown above the block (e.g. an endpoint title). */
  title?: string;
};

export default function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail in insecure contexts — fail quietly.
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {title || language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label="Copy code to clipboard"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}
