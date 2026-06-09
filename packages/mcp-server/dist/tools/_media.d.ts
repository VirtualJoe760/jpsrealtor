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
