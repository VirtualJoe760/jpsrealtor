export type BuildGuidePrompt = {
    /** Stable kebab-case id. Used as the guide:// resource slug and the docs anchor. */
    id: string;
    /** Short human-readable title. */
    title: string;
    /** One-line summary shown in a prompt picker / table of contents. */
    summary: string;
    /** Ordered step number in the guided build (1-based). */
    order: number;
    /** The copy-paste prompt body (markdown). Self-contained. */
    body: string;
};
export declare const BUILD_GUIDE_PROMPTS: readonly BuildGuidePrompt[];
/** Look up a prompt by its stable id. Returns undefined on miss. */
export declare function getBuildGuidePrompt(id: string): BuildGuidePrompt | undefined;
/** All prompt ids, in build order. */
export declare function buildGuidePromptIds(): string[];
