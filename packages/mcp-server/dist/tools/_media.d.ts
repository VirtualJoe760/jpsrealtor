export type ImageBlock = {
    type: "image";
    data: string;
    mimeType: string;
};
/**
 * Fetch one image URL and return it as an MCP image content block (base64).
 * Returns null on any failure so a single bad photo never fails the whole call.
 */
export declare function fetchImageBlock(url: string | undefined | null): Promise<ImageBlock | null>;
/**
 * Fetch one image URL and return it as a base64 `data:` URI string. Used by the
 * MCP App listing board, where photos must be inlined as data: URIs (the only
 * image source the app/artifact sandbox CSP reliably allows). Null on failure.
 */
export declare function fetchImageDataUri(url: string | undefined | null): Promise<string | null>;
