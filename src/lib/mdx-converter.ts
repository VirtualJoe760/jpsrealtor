// src/lib/mdx-converter.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { visit } from "unist-util-visit";

/**
 * Convert MDX/Markdown to HTML for TipTap editor
 * Preserves YouTube component syntax: <YouTube id="..." />
 */
export async function mdxToHtml(mdx: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree) => {
      // Transform <YouTube id="xxx" /> to iframe HTML
      visit(tree, "html", (node: any) => {
        const youtubeMatch = node.value.match(
          /<YouTube\s+id=["']([^"']+)["']\s*\/>/i
        );
        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          node.value = `<div class="youtube-embed" data-youtube-id="${videoId}"><iframe class="aspect-video w-full" src="https://www.youtube.com/embed/${videoId}" title="YouTube Video Player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
        }
      });
    })
    .use(remarkHtml, { sanitize: false });

  const result = await processor.process(mdx);
  return String(result);
}

/**
 * Convert HTML from TipTap back to MDX/Markdown
 * Converts iframes back to <YouTube id="..." /> syntax
 */
export function htmlToMdx(html: string): string {
  let mdx = html;

  // Convert YouTube iframes back to MDX component
  mdx = mdx.replace(
    /<div class="youtube-embed" data-youtube-id="([^"]+)">[\s\S]*?<\/div>/g,
    '<YouTube id="$1" />'
  );

  // Convert TipTap YouTube embeds (if any)
  mdx = mdx.replace(
    /<div[^>]*data-youtube-video[^>]*>[\s\S]*?src="https:\/\/www\.youtube\.com\/embed\/([^"]+)"[\s\S]*?<\/div>/g,
    '<YouTube id="$1" />'
  );

  // Convert standard YouTube iframes
  mdx = mdx.replace(
    /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([^"]+)"[^>]*><\/iframe>/g,
    '<YouTube id="$1" />'
  );

  // Convert headings
  mdx = mdx.replace(/<h1>(.*?)<\/h1>/g, "# $1");
  mdx = mdx.replace(/<h2>(.*?)<\/h2>/g, "## $1");
  mdx = mdx.replace(/<h3>(.*?)<\/h3>/g, "### $1");
  mdx = mdx.replace(/<h4>(.*?)<\/h4>/g, "#### $1");
  mdx = mdx.replace(/<h5>(.*?)<\/h5>/g, "##### $1");
  mdx = mdx.replace(/<h6>(.*?)<\/h6>/g, "###### $1");

  // Convert bold and italic
  mdx = mdx.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
  mdx = mdx.replace(/<em>(.*?)<\/em>/g, "*$1*");
  mdx = mdx.replace(/<b>(.*?)<\/b>/g, "**$1**");
  mdx = mdx.replace(/<i>(.*?)<\/i>/g, "*$1*");

  // Convert links
  mdx = mdx.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)");

  // Convert images
  mdx = mdx.replace(/<img src="([^"]+)" alt="([^"]*)"[^>]*\/?>/g, "![$2]($1)");
  mdx = mdx.replace(/<img src="([^"]+)"[^>]*\/?>/g, "![]($1)");

  // Convert lists
  mdx = mdx.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
    return content.replace(/<li>(.*?)<\/li>/g, "- $1\n");
  });

  mdx = mdx.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
    let counter = 1;
    return content.replace(/<li>(.*?)<\/li>/g, () => {
      return `${counter++}. $1\n`;
    });
  });

  // Convert blockquotes
  mdx = mdx.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, content) => {
    return content
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n");
  });

  // Convert code blocks
  mdx = mdx.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, "```\n$1\n```");

  // Convert inline code
  mdx = mdx.replace(/<code>(.*?)<\/code>/g, "`$1`");

  // Convert paragraphs
  mdx = mdx.replace(/<p>([\s\S]*?)<\/p>/g, "$1\n\n");

  // Convert line breaks
  mdx = mdx.replace(/<br\s*\/?>/g, "\n");

  // Clean up extra whitespace
  mdx = mdx.replace(/\n{3,}/g, "\n\n");
  mdx = mdx.trim();

  return mdx;
}
