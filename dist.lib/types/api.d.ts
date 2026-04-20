import { DOM } from "./types.js";
import { d2Snap as _d2Snap } from "./D2Snap.js";
import { adaptiveD2Snap as _adaptiveD2Snap } from "./AdaptiveD2Snap.js";
export declare function d2Snap(domOrString: DOM | string, ...args: Parameters<typeof _d2Snap> extends [unknown, ...infer T] ? T : never): Promise<import("./types.js").D2SnapResult>;
export declare function adaptiveD2Snap(domOrString: DOM | string, ...args: Parameters<typeof _adaptiveD2Snap> extends [unknown, unknown, ...infer T] ? T : never): Promise<import("./types.js").D2SnapResult & {
    parameters: {
        rE: number;
        rA: number;
        rT: number;
        adaptiveIterations: number;
    };
}>;
