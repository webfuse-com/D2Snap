import { type DOM, type D2SnapOptions, type D2SnapResult } from "./types.js";
import { d2Snap } from "./D2Snap.js";
export declare function adaptiveD2Snap(d2SnapFn: typeof d2Snap, dom: DOM, maxTokens?: number, maxIterations?: number, options?: Partial<D2SnapOptions>): Promise<D2SnapResult & {
    parameters: {
        rE: number;
        rA: number;
        rT: number;
        adaptiveIterations: number;
    };
}>;
