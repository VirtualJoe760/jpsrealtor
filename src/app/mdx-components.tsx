import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import YouTube from "@/components/mdx/YouTube";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    a: ({ href, ...props }) => {
      const isInternalLink = href && href.startsWith("/");
      if (isInternalLink) {
        return <Link href={href} {...props} />;
      }
      return <a href={href} {...props} target="_blank" rel="noopener noreferrer" />;
    },
    YouTube,
  };
}
