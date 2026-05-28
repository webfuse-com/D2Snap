import { type GroundTruthJSON } from "./types.js";

type ElementType = "container" | "actionable" | "textFormatting" | "labeledExtract";

const HARD_FALLBACK_RATING: number = 0.0;
const DEFAULT_LABEL_ATTRS: string[] = [ "aria-label", "title", "alt" ];
const DEFAULT_LABEL_CHILD_TAGS: string[] = [ "title", "desc" ];
const SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES = [
	"aria-",
	"data-"
];
const ATTRIBUTE_SUFFIX_WILDCARD: string = "*";

export class GroundTruth {
	private readonly groundTruth: GroundTruthJSON;

	private readonly elementsByType: Record<ElementType, string[]>;
	private readonly elementTypeSets: Record<ElementType, Set<string>>;
	private readonly nonContainerTagNames: Set<string>;
	private readonly containerRatings: Record<string, number>;
	private readonly containerFallbackRating: number;
	private readonly attributeRatings: Record<string, number>;
	private readonly attributeFallbackRating: number | undefined;
	private readonly attributeRatingCache: Map<string, number> = new Map();
	private readonly labelAttrs: string[];
	private readonly labelChildTagsSet: Set<string>;

	constructor(groundTruth: GroundTruthJSON) {
		this.groundTruth = groundTruth;

		this.elementsByType = {
			container: this.groundTruth?.typeElement?.container?.tagNames ?? [],
			actionable: this.groundTruth?.typeElement?.actionable?.tagNames ?? [],
			textFormatting: this.groundTruth?.typeElement?.textFormatting?.tagNames ?? [],
			labeledExtract: this.groundTruth?.typeElement?.labeledExtract?.tagNames ?? []
		};
		this.elementTypeSets = {
			container: new Set(this.elementsByType.container.map(t => t.toLowerCase())),
			actionable: new Set(this.elementsByType.actionable.map(t => t.toLowerCase())),
			textFormatting: new Set(this.elementsByType.textFormatting.map(t => t.toLowerCase())),
			labeledExtract: new Set(this.elementsByType.labeledExtract.map(t => t.toLowerCase()))
		};
		this.nonContainerTagNames = new Set([
			...this.elementTypeSets.actionable,
			...this.elementTypeSets.textFormatting,
			...this.elementTypeSets.labeledExtract
		]);

		this.containerRatings = this.groundTruth?.typeElement?.container?.ratings ?? {};
		this.containerFallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating ?? HARD_FALLBACK_RATING;

		this.attributeRatings = this.groundTruth?.typeAttribute?.ratings ?? {};
		this.attributeFallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;

		this.labelAttrs = (this.groundTruth?.typeElement?.labeledExtract?.labelAttrs ?? DEFAULT_LABEL_ATTRS)
			.map(a => a.toLowerCase());
		this.labelChildTagsSet = new Set(
			(this.groundTruth?.typeElement?.labeledExtract?.labelChildTags ?? DEFAULT_LABEL_CHILD_TAGS)
				.map(t => t.toLowerCase())
		);
	}

	public getElementsByType(type: ElementType): string[] {
		return [ ...this.elementsByType[type] ];
	}

	public getLabelAttrs(): string[] {
		return [ ...this.labelAttrs ];
	}

	public isLabelChildTag(tagName: string): boolean {
		return this.labelChildTagsSet.has(tagName.toLowerCase());
	}

	public isElementType(type: ElementType, tagName: string): boolean {
		const lowerTagName: string = tagName.toLowerCase();

		const isNativeElement: boolean = this.elementTypeSets[type].has(lowerTagName);
		if(isNativeElement) return true;
		if(type !== "container") return isNativeElement;

		const isCustomElement: boolean = !this.nonContainerTagNames.has(lowerTagName);
		return isCustomElement;
	}

	public getContainerRating(tagName: string): number {
		if(!tagName) return -Infinity;

		const rating: number | undefined = this.containerRatings[tagName.toLowerCase()];
		if(rating !== undefined) return rating;

		return this.containerFallbackRating;
	}

	public getAttributeRatingPrecise(attributeName: string): number | undefined {
		if(!attributeName) return -Infinity;

		const rating: number | undefined = this.attributeRatings[attributeName.toLowerCase()];
		if(rating !== undefined) return rating;

		return this.attributeFallbackRating;
	}

	public getAttributeRating(attributeName: string): number {
		const cached: number | undefined = this.attributeRatingCache.get(attributeName);
		if(cached !== undefined) return cached;

		let rating: number | undefined = this.getAttributeRatingPrecise(attributeName);
		if(!rating) {
			for(const prefix of SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES) {
				if(!attributeName.toLocaleLowerCase().startsWith(prefix)) continue;

				rating = this.getAttributeRatingPrecise(`${prefix}${ATTRIBUTE_SUFFIX_WILDCARD}`);
				break;
			}
		}

		const finalRating: number = rating ?? HARD_FALLBACK_RATING;
		this.attributeRatingCache.set(attributeName, finalRating);
		return finalRating;
	}
}