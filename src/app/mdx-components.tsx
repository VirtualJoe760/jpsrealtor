// src/app/mdx-components.tsx
import type { MDXComponents } from "mdx/types";
import MDXLink from "@/components/mdx/Link";
import YouTube from "@/components/mdx/YouTube";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    a: MDXLink, // Use MDXLink for all <a> tags
    YouTube,    // Keep the YouTube component
  };
}
