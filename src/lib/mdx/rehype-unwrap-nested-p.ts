// src/lib/mdx/rehype-unwrap-nested-p.ts
//
// Rehype plugin: unwrap a <p> that is a direct child of another <p>.
//
// MDX content (authored or AI-generated, stored in Mongo) sometimes contains a
// literal block element like `<p className="text-xs ...">disclaimer text</p>`.
// The markdown text inside gets re-wrapped in its own <p>, yielding
// `<p><p>...</p></p>` — invalid HTML that throws a React hydration error
// ("In HTML, <p> cannot be a descendant of <p>").
//
// IMPORTANT: a literal `<p className="...">` written in MDX is NOT a plain hast
// element — at the rehype stage it's an `mdxJsxFlowElement`/`mdxJsxTextElement`
// node with `name: "p"`. The inner, markdown-generated paragraph IS a hast
// `element` with `tagName: "p"`. So we must treat BOTH representations as "a
// <p>" for the parent and the child, or the literal-wrapper case slips through
// (which is exactly the disclaimer case). Dependency-free tree walk.

type AnyNode = {
  type?: string;
  tagName?: string; // hast element
  name?: string; // mdxJsxFlowElement / mdxJsxTextElement
  children?: AnyNode[];
};

function isParagraph(node: AnyNode | undefined): boolean {
  if (!node) return false;
  if (node.type === "element" && node.tagName === "p") return true;
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name === "p"
  ) {
    return true;
  }
  return false;
}

export function rehypeUnwrapNestedP() {
  return (tree: AnyNode) => {
    const walk = (node: AnyNode) => {
      if (!node.children || node.children.length === 0) return;
      // Depth-first so deeply nested cases collapse bottom-up.
      for (const child of node.children) walk(child);

      if (isParagraph(node)) {
        const flattened: AnyNode[] = [];
        for (const child of node.children) {
          if (isParagraph(child)) {
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
