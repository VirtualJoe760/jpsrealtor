// src/lib/markdown-parser.ts
// Simple markdown parser for basic formatting (bold and links)

import React from "react";

export function parseMarkdown(text: string, isLight: boolean = false): React.ReactNode {
  if (!text) return text;

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
        React.createElement(React.Fragment, { key: key++ },
          text.slice(currentIndex, match.index)
        )
      );
    }

    const matched = match[0];

    // Check if it's bold
    if (matched.startsWith("**") && matched.endsWith("**")) {
      const boldText = matched.slice(2, -2);
      elements.push(
        React.createElement(
          "strong",
          {
            key: key++,
            className: `font-bold ${isLight ? "text-gray-900" : "text-white"}`,
          },
          boldText
        )
      );
    }
    // Check if it's a link
    else if (matched.startsWith("[")) {
      const linkMatch = matched.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch;
        const isInternal = linkUrl?.startsWith("/") ?? false;
        elements.push(
          React.createElement(
            "a",
            {
              key: key++,
              href: linkUrl || "#",
              className: `underline transition-colors font-medium ${
                isLight
                  ? "text-blue-600 hover:text-blue-800"
                  : "text-emerald-400 hover:text-emerald-300"
              }`,
              target: isInternal ? undefined : "_blank",
              rel: isInternal ? undefined : "noopener noreferrer",
            },
            linkText
          )
        );
      }
    }

    currentIndex = match.index + matched.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    elements.push(
      React.createElement(React.Fragment, { key: key++ }, text.slice(currentIndex))
    );
  }

  return elements.length > 0 ? elements : text;
}
