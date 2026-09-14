import { type GroundTruthJSON } from "./types.js";
type ElementType = "container" | "actionable" | "textFormatting" | "replaceWithLabel";
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
    private readonly labelAttrs;
    private readonly labelChildTagsSet;
    private readonly labelClassPatterns;
    constructor(groundTruth: GroundTruthJSON);
    hasLabelClassPatterns(): boolean;
    /**
     * Class tokens that name an icon, per the configured patterns. An icon font
     * needs its vendor class in the markup to render, so that class is the only
     * description an icon-only control carries.
     */
    getLabelClassTokens(className: string): string[];
    getElementsByType(type: ElementType): string[];
    getLabelAttrs(): readonly string[];
    isLabelChildTag(tagName: string): boolean;
    isElementType(type: ElementType, tagName: string): boolean;
    getContainerRating(tagName: string): number;
    getAttributeRatingPrecise(attributeName: string): number | undefined;
    getAttributeRating(attributeName: string): number;
}
export {};
