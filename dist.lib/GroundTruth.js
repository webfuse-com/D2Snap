const HARD_FALLBACK_RATING = 0;
const SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES = [
  "aria-",
  "data-"
];
const ATTRIBUTE_SUFFIX_WILDCARD = "*";
class GroundTruth {
  groundTruth;
  constructor(groundTruth) {
    this.groundTruth = groundTruth;
  }
  isElementType(type, tagName) {
    const isNativeElement = (this.groundTruth?.typeElement[type]?.tagNames ?? []).includes(tagName.toLowerCase());
    if (isNativeElement) return true;
    if (type !== "container") return isNativeElement;
    const isCustomElement = ![
      ...this.groundTruth?.typeElement.actionable?.tagNames ?? [],
      ...this.groundTruth?.typeElement.textFormatting?.tagNames ?? []
    ].includes(tagName.toLowerCase());
    return isCustomElement;
  }
  getContainerRating(tagName) {
    if (!tagName) return -Infinity;
    const rating = (this.groundTruth?.typeElement?.container?.ratings ?? {})[tagName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
  getAttributeRatingPrecise(attributeName) {
    if (!attributeName) return -Infinity;
    const rating = (this.groundTruth?.typeAttribute?.ratings ?? {})[attributeName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
    return fallbackRating;
  }
  getAttributeRating(attributeName) {
    let rating = this.getAttributeRatingPrecise(attributeName);
    if (!rating) {
      for (const prefix of SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES) {
        if (!attributeName.toLocaleLowerCase().startsWith(prefix)) continue;
        rating = this.getAttributeRatingPrecise(`${prefix}${ATTRIBUTE_SUFFIX_WILDCARD}`);
        break;
      }
    }
    return rating ?? HARD_FALLBACK_RATING;
  }
}
export {
  GroundTruth
};
