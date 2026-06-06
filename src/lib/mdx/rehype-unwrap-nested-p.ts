// src/lib/mdx/rehype-unwrap-nested-p.ts
//
// Rehype plugin: unwrap a <p> that is a direct child of another <p>.
//
// MDX content (authored or AI-generated, stored in Mongo) sometimes contains a
// literal block element like `<p className="text-xs ...">disclaimer text</p>`.
// The markdown text inside gets re-wrapped in its own <p>, yielding
// `<p><p>...</p></p>` — invalid HTML that throws a React hydration error
// ("In HTML, <p> cannot be a descendant of <p>"). This flattens the nesting
// while preserving the outer (often styled) <p> and its text, so the whole
// class of pages is fixed at the renderer instead of per-document.
//
// Dependency-free hast walk (no unist-util-visit import needed).

type HastNode = {
  type?: string;
  tagName?: string;
  children?: HastNode[];
};

export function rehypeUnwrapNestedP() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children || node.children.length === 0) return;
      // Depth-first so deeply nested cases collapse bottom-up.
      for (const child of node.children) walk(child);

      if (node.type === "element" && node.tagName === "p") {
        const flattened: HastNode[] = [];
        for (const child of node.children) {
          if (child.type === "element" && child.tagName === "p") {
            // Replace the invalid inner <p> with its own children.
            flattened.push(...(child.children || []));
          } else {
            flattened.push(child);
          }
        }
        node.children = flattened;
      }
    };
    walk(tree);
  };
}
