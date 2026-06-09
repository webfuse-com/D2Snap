const HARD_FALLBACK_RATING = 0;
const SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES = [
  "aria-",
  "data-"
];
const ATTRIBUTE_SUFFIX_WILDCARD = "*";
class GroundTruth {
  groundTruth;
  elementsByType;
  elementTypeSets;
  nonContainerTagNames;
  containerRatings;
  containerFallbackRating;
  attributeRatings;
  attributeFallbackRating;
  attributeRatingCache = /* @__PURE__ */ new Map();
  constructor(groundTruth) {
    this.groundTruth = groundTruth;
    this.elementsByType = {
      container: this.groundTruth?.typeElement?.container?.tagNames ?? [],
      actionable: this.groundTruth?.typeElement?.actionable?.tagNames ?? [],
      textFormatting: this.groundTruth?.typeElement?.textFormatting?.tagNames ?? []
    };
    this.elementTypeSets = {
      container: new Set(this.elementsByType.container.map((t) => t.toLowerCase())),
      actionable: new Set(this.elementsByType.actionable.map((t) => t.toLowerCase())),
      textFormatting: new Set(this.elementsByType.textFormatting.map((t) => t.toLowerCase()))
    };
    this.nonContainerTagNames = /* @__PURE__ */ new Set([
      ...this.elementTypeSets.actionable,
      ...this.elementTypeSets.textFormatting
    ]);
    this.containerRatings = this.groundTruth?.typeElement?.container?.ratings ?? {};
    this.containerFallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating ?? HARD_FALLBACK_RATING;
    this.attributeRatings = this.groundTruth?.typeAttribute?.ratings ?? {};
    this.attributeFallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
  }
  getElementsByType(type) {
    return [...this.elementsByType[type]];
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
  GroundTruth
};
