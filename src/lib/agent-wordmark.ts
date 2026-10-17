// src/lib/agent-wordmark.ts
//
// The default site mark for an agent who hasn't set one: their own name, in
// the same two-weight treatment as every other wordmark (thin first names,
// bold surname — GENE CRUCEAN).
//
// WHY THIS EXISTS: with no text wordmark, logo or site name configured, every
// agent site fell back to the CHATREALTY wordmark — so the platform's brand
// sat on top of the agent's own site (genecrucean.chatrealty.io read
// "CHATREALTY" in the nav and the chat hero). The platform brand belongs on
// platform hosts only; an agent's site says who the agent is.

export function nameWordmark(name?: string | null): { thin: string; bold: string } | null {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return { thin: "", bold: words[0] };
  return { thin: words.slice(0, -1).join(" "), bold: words[words.length - 1] };
}
