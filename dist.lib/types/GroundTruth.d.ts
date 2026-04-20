import { GroundTruthJSON } from "./types.js";
export declare class GroundTruth {
    private readonly groundTruth;
    constructor(groundTruth: GroundTruthJSON);
    isElementType(type: "container" | "actionable" | "textFormatting", tagName: string): boolean;
    getContainerRating(tagName: string): number;
    getAttributeRating(attributeName: string): number;
}
export declare function createDefaultGroundTruth(): Promise<GroundTruth>;
