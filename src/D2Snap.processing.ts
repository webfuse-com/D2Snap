import { type D2SnapOptions } from "./types.js";
import { NodeType, NodeFilter } from "./enums.js";
import { minifyDOM, traverseDom } from "./util.dom.js";
import { formatHTML, isRawTextElement, isVoidElement } from "./util.html.js";
import { NON_RENDERED_TAG_NAMES, SVG_LABEL_TAG_NAMES } from "./var.SEMANTICS_TAGS.js";


interface DOMPreProcessingOptions {
	filter: Pick<D2SnapOptions["filter"], "attributes" | "dataURLs" | "elements" | "emptyElements">;
	normalize: Pick<D2SnapOptions["normalize"], "iconClasses" | "labelAttributes" | "svgToImg">;
}

interface DOMPostProcessingOptions {
	filter: Pick<D2SnapOptions["filter"], "emptyElements">;
	minify: boolean;
}

interface HTMLPostProcessingOptions {
	debug: boolean;
}


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;
const UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER: string = "-";


function normalizeCaseInsensitive(str: string): string {
	return str.toUpperCase();
}

function normalizeCaseInsensitiveArray(tagNames: string[]): string[] {
	return tagNames
		.map((tagName: string) => normalizeCaseInsensitive(tagName));
}

function elementHasTagName(elementNode: Element, tagName: string): boolean {
	return normalizeCaseInsensitive(elementNode.tagName) === normalizeCaseInsensitive(tagName);
}

function hasRenderedText(node: Node): boolean {
	for(const child of node.childNodes) {
		if(child.nodeType === NodeType.TEXT_NODE) {
			if((child.nodeValue ?? "").trim()) return true;

			continue;
		}

		if(child.nodeType !== NodeType.ELEMENT_NODE) continue;
		if(NON_RENDERED_TAG_NAMES.has(normalizeCaseInsensitive((child as Element).tagName))) continue;

		if(hasRenderedText(child)) return true;
	}

	return false;
}

function elementHasNoTextContent(elementNode: Element): boolean {
	return !hasRenderedText(elementNode)
		&& ![ ...elementNode.querySelectorAll("img[alt]") ]
			.some((image: Element) => !!resolveAttributeAsString(image, "alt"));
}

function resolveAttributeAsString(elementNode: Element, attributeName: string): string {
	return (elementNode.getAttribute(attributeName) ?? "").trim();
}

function resolveIdReferenceText(elementNode: Element, document: Document, id: string): string {
	const selector: string = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
	const scopes: ParentNode[] = [ elementNode.getRootNode() as ParentNode, document ];

	for(const scope of scopes) {
		for(const candidate of scope.querySelectorAll?.(selector) ?? []) {
			const text: string = (candidate.textContent ?? "").trim();

			if(text) return text;
		}
	}

	return "";
}

function getElementLabelAttribute(elementNode: Element, document: Document, labelAttributeNames: string[]): string | null {
	for(const labelAttributeName of labelAttributeNames) {
		const labelAttributeValue: string = resolveAttributeAsString(elementNode, labelAttributeName);

		if(!labelAttributeValue) continue;

		if(normalizeCaseInsensitive(labelAttributeName) !== normalizeCaseInsensitive("aria-labelledby")) {
			return labelAttributeValue;
		}

		const referencedText: string = labelAttributeValue
			.split(/\s+/)
			.map((id: string) => resolveIdReferenceText(elementNode, document, id))
			.filter(Boolean)
			.join(" ");

		if(referencedText) return referencedText;
	}

	return null;
}

function createImage(document: Document, alt: string = ""): HTMLImageElement {
	const imgSubstituteElementNode: HTMLImageElement = document.createElement("img");

	alt
		&& imgSubstituteElementNode.setAttribute("alt", alt);

	return imgSubstituteElementNode;
}

function replaceElementByImage(elementNode: Element, document: Document, alt: string = "") {
	const imgSubstituteElementNode: HTMLImageElement = createImage(document, alt);

	elementNode.replaceWith(imgSubstituteElementNode);

	return imgSubstituteElementNode;
}


export function preProcessDOM(
	domRoot: Element,
	document: Document,
	options: DOMPreProcessingOptions,
	isActionableElement: (elementNode: Element) => boolean
): void {
	const filterElementsTagNames: Set<string> = new Set(normalizeCaseInsensitiveArray(options.filter?.elements ?? []));
	const filterAttributesNames: Set<string> = new Set(normalizeCaseInsensitiveArray(options.filter?.attributes ?? []));
	const iconClasses: string[] = options.normalize?.iconClasses ?? [];
	const labelAttributes: string[] = options.normalize?.labelAttributes ?? [];

	const preResolvedLabels = new WeakMap<Element, string>();

	for(const referrer of document.querySelectorAll("[aria-labelledby]")) {
		const label: string | null = getElementLabelAttribute(referrer, document, labelAttributes);
		label && preResolvedLabels.set(referrer, label);
	}

	const resolveLabel = (element: Element): string | null => {
		return preResolvedLabels.get(element) ?? getElementLabelAttribute(element, document, labelAttributes);
	};

	traverseDom<HTMLElement>(
		domRoot,
		NodeFilter.SHOW_ALL,
		(node: Node) => {
			// Filters + Normalization
			// STRICT ORDER MATTERS

			// Filter

			if(node.nodeType === NodeType.COMMENT_NODE) {
				node.parentNode?.removeChild(node);

				return;
			}

			if(node.nodeType !== NodeType.ELEMENT_NODE) return;

			const elementNode = node as Element;

			// Filter (optionals)
			// Root node-destructive operations are no-ops, otherwise the DOm would break.
			// Non-full document input snippets are wrapped by BODY to have a generic wrapper.

			if(filterElementsTagNames.has(normalizeCaseInsensitive(elementNode.tagName))) {
				elementNode.remove();

				return;
			}

			for(const attr of [ ...elementNode.attributes ]) {
				if(filterAttributesNames.has(normalizeCaseInsensitive(attr.name))) {
					elementNode.removeAttribute(attr.name);
				}
			}

			if(options.filter?.dataURLs) {
				for(const attr of Array.from(elementNode.attributes)) {
					if(
						(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
							|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
					) continue;

					elementNode.removeAttribute(attr.name);
				}
			}

			if(options.filter?.emptyElements) {
				if(elementHasTagName(elementNode, "IMG") && !resolveLabel(elementNode)) {
					if(
						!resolveAttributeAsString(elementNode, "src")
						&& !resolveAttributeAsString(elementNode, "alt")
					 ) {
						elementNode.remove();

						return;
					}
				}
			}

			// Normalize (optionals)

			// Meta-image to image.
			if(elementHasTagName(elementNode, "SVG")) {
				if(options.normalize?.svgToImg) {
					let labelValue: string = "";
					for(const svgLabelTagName of SVG_LABEL_TAG_NAMES) {
						labelValue = (elementNode.querySelector(svgLabelTagName.toLowerCase())?.textContent ?? "").trim();
						if(labelValue) break;
					}

					labelValue ||= resolveLabel(elementNode) ?? "";

					return [ replaceElementByImage(elementNode, document, labelValue) ];
				}
			} else if(iconClasses.length) {
				if(elementHasNoTextContent(elementNode) && elementNode.children.length === 0) {
					let iconfontsInClass: string | null = null;

					for(const className of [ ...elementNode.classList ].reverse()) {
						const iconfontName: string | undefined = iconClasses
							.find((name: string) => {
								return className.startsWith(`${name}${UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER}`)
							});

						if(!iconfontName) continue;

						iconfontsInClass = className
							.slice(iconfontName.length + UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER.length);

						break;
					}

					if(iconfontsInClass) {
						const alt: string = resolveLabel(elementNode) ?? iconfontsInClass;

						if(!isActionableElement(elementNode)) {
							return [ replaceElementByImage(elementNode, document, alt) ];
						} else {
							elementNode.prepend(createImage(document, alt));
						}
					}
				}
			}

			// Text-label attributes to text (non-void elements) or 'alt' (image elements).
			if(labelAttributes.length) {
				if(!isRawTextElement(elementNode.tagName)) {
					const labelAttributeValue: string | null = resolveLabel(elementNode);

					if(labelAttributeValue) {
						if(elementHasTagName(elementNode, "IMG")) {
							// Image
							const altAttributeValue: string = resolveAttributeAsString(elementNode, "alt");
							!altAttributeValue
								&& elementNode.setAttribute("alt", labelAttributeValue);
						} else if(!isVoidElement(elementNode.tagName)) {
							// Text
							elementHasNoTextContent(elementNode)
								&& elementNode.prepend(labelAttributeValue);
						}
					}
				}
			}
		}
	);
}

export function postProcessDOM(
	domRoot: Element,
	options: DOMPostProcessingOptions,
	isActionableElement: (elementNode: Element) => boolean
): void {
	// Remove elements that became empty
	if (options.filter?.emptyElements) {
		let hasRemovedElement: boolean;

		do {
			hasRemovedElement = false;

			traverseDom<HTMLElement>(
				domRoot,
				NodeFilter.SHOW_ELEMENT,
				(elementNode: HTMLElement) => {
					if (isActionableElement(elementNode)) return;
					// TODO: isVoid helper, too
					if (isVoidElement(elementNode.tagName)) return;
					if (elementNode.children.length || elementNode.textContent.trim().length) return;

					elementNode.remove();

					hasRemovedElement = true;
				}
			);
		} while (hasRemovedElement);
	}

	// Minify
	if(options.minify) {
		minifyDOM(domRoot);
	}
}

export function postProcessHTML(html: string, options: Partial<HTMLPostProcessingOptions>): string {
	const optionsWithDefaults: HTMLPostProcessingOptions = {
		debug: false,

		...options
	};

	let processedHTML = html;

	// Format
	if (optionsWithDefaults.debug) {
		processedHTML = formatHTML(processedHTML);
	}

	return processedHTML;
}