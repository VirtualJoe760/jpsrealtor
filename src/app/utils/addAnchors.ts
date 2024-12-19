// src\app\utils\addAnchors.ts

import { visit } from "unist-util-visit";
import { Plugin } from "unified";
import { Heading, Text } from "mdast";

function isText(node: unknown): node is Text {
    return typeof node === "object" && node !== null && (node as Text).type === "text";
  }

export const addAnchors: Plugin = () => {
  return (tree) => {
    visit(tree, "heading", (node: Heading) => {
      if (node.depth === 2) {
        const textContent = node.children
          .map((child) => (isText(child) ? child.value : ""))
          .join("");

        const id = textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        node.data = {
          ...node.data,
          hProperties: {
            ...(node.data?.hProperties || {}),
            id,
          },
        };

        // Add a Markdown-compatible link (avoids adding HTML elements directly)
        node.children.push({
            type: "html",
            value: `<a href="#${id}" class="anchor-icon ml-2 text-indigo-400 hover:text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 inline">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h-6a3 3 0 00-3 3v6a3 3 0 003 3h6m3-12h6a3 3 0 013 3v6a3 3 0 01-3 3h-6m-3-3l3-3m0 0l-3-3m3 3H3" />
              </svg>
            </a>`,
          });
      }
    });
  };
};
