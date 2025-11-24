/**
 * Parses markdown text for basic formatting (bold, links)
 * Extracted from IntegratedChatWidget.tsx
 */
import React from "react";

export function parseMarkdown(text: string, isLight: boolean = false): React.ReactNode {
  if (!text) return text;

  // First, handle links and bold together
  const elements: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Combined regex to match both bold (**text**) and links ([text](url))
  const markdownRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  let match;

  while ((match = markdownRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      elements.push(
        <React.Fragment key={key++}>
          {text.slice(currentIndex, match.index)}
        </React.Fragment>
      );
    }

    const matched = match[0];

    // Check if it's bold
    if (matched.startsWith("**") && matched.endsWith("**")) {
      const boldText = matched.slice(2, -2);
      elements.push(
        <strong key={key++} className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          {boldText}
        </strong>
      );
    }
    // Check if it's a link
    else if (matched.startsWith("[")) {
      const linkMatch = matched.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch;
        // Check if it's an internal link (starts with /)
        const isInternal = linkUrl?.startsWith("/") ?? false;
        elements.push(
          <a
            key={key++}
            href={linkUrl || "#"}
            className={`underline transition-colors font-medium ${
              isLight
                ? "text-blue-600 hover:text-blue-800"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
            target={isInternal ? undefined : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
          >
            {linkText}
          </a>
        );
      }
    }

    currentIndex = match.index + matched.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    elements.push(
      <React.Fragment key={key++}>{text.slice(currentIndex)}</React.Fragment>
    );
  }

  return elements.length > 0 ? elements : text;
}
