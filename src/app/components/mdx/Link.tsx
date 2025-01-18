"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface MDXLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function MDXLink({ href, children, ...props }: MDXLinkProps) {
  const pathname = usePathname();

  if (href.startsWith("#")) {
    // Prepend the current pathname to the anchor link
    const relativeHref = `${pathname}${href}`;
    return <a href={relativeHref} {...props}>{children}</a>;
  }

  if (href.startsWith("/")) {
    // Internal link using Next.js Link
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  // External link
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
