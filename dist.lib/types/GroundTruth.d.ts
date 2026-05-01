import { type GroundTruthJSON } from "./types.js";
export declare class GroundTruth {
    private readonly groundTruth;
    constructor(groundTruth: GroundTruthJSON);
    isElementType(type: "container" | "actionable" | "textFormatting", tagName: string): boolean;
    getContainerRating(tagName: string): number;
    getAttributeRatingPrecise(attributeName: string): number | undefined;
    getAttributeRating(attributeName: string): number;
}
