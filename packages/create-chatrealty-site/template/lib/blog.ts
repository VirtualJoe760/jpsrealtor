// Minimal, dependency-free markdown rendering for blog posts. Handles the
// subset the CMS/Claude actually emits: ## / ### headings, paragraphs,
// **bold**, *italic*, and ordered/unordered lists. Everything is escaped
// first, so post content can't inject markup.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderMarkdown(md: string): string {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html: string[] = [];
  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith("### ")) {
      html.push(`<h3>${inline(b.slice(4))}</h3>`);
    } else if (b.startsWith("## ")) {
      html.push(`<h2>${inline(b.slice(3))}</h2>`);
    } else if (b.startsWith("# ")) {
      html.push(`<h2>${inline(b.slice(2))}</h2>`);
    } else if (/^(\d+\.|[-*])\s/.test(b)) {
      const ordered = /^\d+\./.test(b);
      const items = b
        .split("\n")
        .map((l) => l.replace(/^(\d+\.|[-*])\s+/, "").trim())
        .filter(Boolean)
        .map((l) => `<li>${inline(l)}</li>`)
        .join("");
      html.push(ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
    } else {
      html.push(`<p>${inline(b.replace(/\n/g, " "))}</p>`);
    }
  }
  return html.join("\n");
}

export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}
