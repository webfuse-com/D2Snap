import { type GroundTruthJSON } from "./types.js";
type ElementType = "container" | "actionable" | "textFormatting";
export declare class GroundTruth {
    private readonly groundTruth;
    private readonly elementsByType;
    private readonly elementTypeSets;
    private readonly nonContainerTagNames;
    private readonly containerRatings;
    private readonly containerFallbackRating;
    private readonly attributeRatings;
    private readonly attributeFallbackRating;
    private readonly attributeRatingCache;
    constructor(groundTruth: GroundTruthJSON);
    getElementsByType(type: ElementType): string[];
    isElementType(type: ElementType, tagName: string): boolean;
    getContainerRating(tagName: string): number;
    getAttributeRatingPrecise(attributeName: string): number | undefined;
    getAttributeRating(attributeName: string): number;
}
export {};
