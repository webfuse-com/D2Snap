import { type DeepPartial, type DOM, type D2SnapOptions, type D2SnapResult } from "./types.js";
export interface AdaptiveParameters {
    rE: number;
    rA: number;
    rT: number;
}
export type AdaptiveD2SnapResult = D2SnapResult & {
    parameters: AdaptiveParameters;
    adaptiveIterations: number;
};
export type AdaptiveD2SnapError = RangeError & {
    meta: {
        lastEstimate: number;
    };
};
export declare function adaptiveD2Snap(dom: DOM, maxTokens?: number, // 32768
maxIterations?: number, options?: DeepPartial<D2SnapOptions>): AdaptiveD2SnapResult;
