export declare const BUILD_GUIDE_URI = "guide://chatrealty/build-guide";
export declare const BUILD_GUIDE_URI_PREFIX = "guide://chatrealty/build-guide/";
export declare const BUILD_GUIDE_MIME = "text/markdown";
export type GuideResource = {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
};
/** The list of guide resources advertised in `resources/list`. */
export declare function listGuideResources(): GuideResource[];
/** True if a URI belongs to the build-guide namespace this module serves. */
export declare function isGuideUri(uri: string): boolean;
/**
 * Resolve a `guide://chatrealty/build-guide[/<id>]` URI to its markdown body.
 * Returns null for any URI outside this namespace OR an unknown prompt id, so
 * the caller can map it to a proper "unknown resource" error.
 */
export declare function readGuideResource(uri: string): {
    uri: string;
    mimeType: string;
    text: string;
} | null;
