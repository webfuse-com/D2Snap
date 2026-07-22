import { type UIFeatureHeuristicsJSON } from "./types.js";
type ElementType = "container" | "actionable" | "textFormatting" | "replaceWithLabel";
export declare class UIFeatureHeuristics {
    private readonly uiFeatureHeuristics;
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
    constructor(uiFeatureHeuristics: UIFeatureHeuristicsJSON);
    getElementsByType(type: ElementType): string[];
    getLabelAttrs(): readonly string[];
    isLabelChildTag(tagName: string): boolean;
    isElementType(type: ElementType, tagName: string): boolean;
    getContainerRating(tagName: string): number;
    getAttributeRatingPrecise(attributeName: string): number | undefined;
    getAttributeRating(attributeName: string): number;
}
export {};
