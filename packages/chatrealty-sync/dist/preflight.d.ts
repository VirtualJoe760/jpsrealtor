import { ResoClient } from "./reso-fetch.js";
export type PreflightVerdict = "fits" | "tight" | "exceeds" | "unknown";
export interface PreflightResult {
    verdict: PreflightVerdict;
    lines: string[];
    feedCount: number | null;
    projectedBytes: number | null;
    limitBytes: number;
    tier: string;
    upgradeUrl: string;
}
export declare function seedPreflight(opts: {
    dbUrl: string;
    reso: ConstructorParameters<typeof ResoClient>[0];
    env?: NodeJS.ProcessEnv;
    /**
     * How many associations this key can reach at all. When it is 1 there is
     * nothing to narrow, and the preflight must stop offering narrowing as a
     * remedy — following it costs a destructive `init` and changes nothing.
     */
    availableNetworks?: number | null;
}): Promise<PreflightResult>;
