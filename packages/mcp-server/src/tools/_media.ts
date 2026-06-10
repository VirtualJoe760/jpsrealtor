// packages/mcp-server/src/tools/_media.ts
//
// Shared helper for tools that embed RENDERED photos (MCP image content blocks).
// Plain photo URLs don't render in chat clients — Claude shows a broken-image
// icon — so to actually display a photo we fetch it and return base64.

export type ImageBlock = { type: "image"; data: string; mimeType: string };

/**
 * Fetch one image URL and return it as an MCP image content block (base64).
 * Returns null on any failure so a single bad photo never fails the whole call.
 */
export async function fetchImageBlock(url: string | undefined | null): Promise<ImageBlock | null> {
  if (!url) return null;
  try {
    // Prefer webp so Next's image optimizer returns the smaller variant.
    const res = await fetch(url, { headers: { Accept: "image/webp,image/avif,image/*" } });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 5_000_000) return null; // skip empty / oversized
    return { type: "image", data: buf.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

/**
 * Fetch one image URL and return it as a base64 `data:` URI string. Used by the
 * MCP App listing board, where photos must be inlined as data: URIs (the only
 * image source the app/artifact sandbox CSP reliably allows). Null on failure.
 */
export async function fetchImageDataUri(url: string | undefined | null): Promise<string | null> {
  const block = await fetchImageBlock(url);
  return block ? `data:${block.mimeType};base64,${block.data}` : null;
}
