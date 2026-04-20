const HARD_FALLBACK_RATING = 0;
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
  getAttributeRating(attributeName) {
    if (!attributeName) return -Infinity;
    const rating = (this.groundTruth?.typeAttribute?.ratings ?? {})[attributeName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
}
async function createDefaultGroundTruth() {
  return new GroundTruth(
    (await import("./var.GROUND_TRUTH.js")).GROUND_TRUTH
  );
}
export {
  GroundTruth,
  createDefaultGroundTruth
};
