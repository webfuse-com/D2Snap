const HARD_FALLBACK_RATING = 0;
const DEFAULT_LABEL_ATTRS = ["aria-label", "title", "alt"];
const DEFAULT_LABEL_CHILD_TAGS = ["title", "desc"];
const SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES = [
  "aria-",
  "data-"
];
const ATTRIBUTE_SUFFIX_WILDCARD = "*";
class UIFeatureHeuristics {
  uiFeatureHeuristics;
  elementsByType;
  elementTypeSets;
  nonContainerTagNames;
  containerRatings;
  containerFallbackRating;
  attributeRatings;
  attributeFallbackRating;
  attributeRatingCache = /* @__PURE__ */ new Map();
  labelAttrs;
  labelChildTagsSet;
  constructor(uiFeatureHeuristics) {
    this.uiFeatureHeuristics = uiFeatureHeuristics;
    this.elementsByType = {
      container: this.uiFeatureHeuristics?.typeElement?.container?.tagNames ?? [],
      actionable: this.uiFeatureHeuristics?.typeElement?.actionable?.tagNames ?? [],
      textFormatting: this.uiFeatureHeuristics?.typeElement?.textFormatting?.tagNames ?? [],
      replaceWithLabel: this.uiFeatureHeuristics?.typeElement?.replaceWithLabel?.tagNames ?? []
    };
    this.elementTypeSets = {
      container: new Set(this.elementsByType.container.map((t) => t.toLowerCase())),
      actionable: new Set(this.elementsByType.actionable.map((t) => t.toLowerCase())),
      textFormatting: new Set(this.elementsByType.textFormatting.map((t) => t.toLowerCase())),
      replaceWithLabel: new Set(this.elementsByType.replaceWithLabel.map((t) => t.toLowerCase()))
    };
    this.nonContainerTagNames = /* @__PURE__ */ new Set([
      ...this.elementTypeSets.actionable,
      ...this.elementTypeSets.textFormatting,
      ...this.elementTypeSets.replaceWithLabel
    ]);
    this.containerRatings = this.uiFeatureHeuristics?.typeElement?.container?.ratings ?? {};
    this.containerFallbackRating = this.uiFeatureHeuristics?.typeElement?.container?.fallbackRating ?? HARD_FALLBACK_RATING;
    this.attributeRatings = this.uiFeatureHeuristics?.typeAttribute?.ratings ?? {};
    this.attributeFallbackRating = this.uiFeatureHeuristics?.typeAttribute?.fallbackRating;
    this.labelAttrs = (this.uiFeatureHeuristics?.typeElement?.replaceWithLabel?.labelAttrs ?? DEFAULT_LABEL_ATTRS).map((a) => a.toLowerCase());
    this.labelChildTagsSet = new Set(
      (this.uiFeatureHeuristics?.typeElement?.replaceWithLabel?.labelChildTags ?? DEFAULT_LABEL_CHILD_TAGS).map((t) => t.toLowerCase())
    );
  }
  getElementsByType(type) {
    return [...this.elementsByType[type]];
  }
  getLabelAttrs() {
    return this.labelAttrs;
  }
  isLabelChildTag(tagName) {
    return this.labelChildTagsSet.has(tagName.toLowerCase());
  }
  isElementType(type, tagName) {
    const lowerTagName = tagName.toLowerCase();
    const isNativeElement = this.elementTypeSets[type].has(lowerTagName);
    if (isNativeElement) return true;
    if (type !== "container") return isNativeElement;
    const isCustomElement = !this.nonContainerTagNames.has(lowerTagName);
    return isCustomElement;
  }
  getContainerRating(tagName) {
    if (!tagName) return -Infinity;
    const rating = this.containerRatings[tagName.toLowerCase()];
    if (rating !== void 0) return rating;
    return this.containerFallbackRating;
  }
  getAttributeRatingPrecise(attributeName) {
    if (!attributeName) return -Infinity;
    const rating = this.attributeRatings[attributeName.toLowerCase()];
    if (rating !== void 0) return rating;
    return this.attributeFallbackRating;
  }
  getAttributeRating(attributeName) {
    const cached = this.attributeRatingCache.get(attributeName);
    if (cached !== void 0) return cached;
    let rating = this.getAttributeRatingPrecise(attributeName);
    if (!rating) {
      for (const prefix of SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES) {
        if (!attributeName.toLocaleLowerCase().startsWith(prefix)) continue;
        rating = this.getAttributeRatingPrecise(`${prefix}${ATTRIBUTE_SUFFIX_WILDCARD}`);
        break;
      }
    }
    const finalRating = rating ?? HARD_FALLBACK_RATING;
    this.attributeRatingCache.set(attributeName, finalRating);
    return finalRating;
  }
}
export {
  UIFeatureHeuristics
};
