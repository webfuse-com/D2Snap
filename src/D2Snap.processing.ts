import { NodeFilter, NodeType } from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import { DEFAULT_FILTER_TAG_NAMES, DEFAULT_LABEL_TO_TEXT_TAG_NAMES } from "./var.DEFAULTS_TAGS.js";
import { traverseDom } from "./util.dom.js";
import { formatHTML, isVoidElement } from "./util.html.js";


interface DOMPreProcessingOptions {
	filter: Partial<{
		dataURLs: boolean;
		tagNames: string[];
	}>;
	labelToText: Partial<{
		iconFonts: boolean,
		tagNames: string[];
	}>;
	uniqueIDs: boolean;
}

interface DOMPostProcessingOptions {
	filter: Partial<{
		emptyElements: boolean;
	}>;
}

interface HTMLPostProcessingOptions {
	debug: boolean;
	minify: boolean;
}


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;


function tagNamesToNormalizedSet(tagNames: string[]): Set<string> {
	return new Set(
		tagNames
			.map((tagName: string) => tagName.toUpperCase())
	);
}

function liftImageDescription(document: Document, elementNode: Element) {
	// Find an accessibility label, preferring attributes over child elements.
	// Attribute order is taken from the UI feature heuristics (default: aria-label, title, alt).
	let label: string | null = null;
	for (const attrName of ["aria-label", "title", "alt"]) {
		const value: string | null = elementNode.getAttribute(attrName);
		const trimmed: string = (value ?? "").trim();
		if (trimmed) { label = trimmed; break; }
	}
	if (!label) {
		for (const child of Array.from(elementNode.children)) {
			if (!["title", "desc"].includes(child.tagName)) continue;
			const trimmed: string = (child.textContent ?? "").trim();
			if (trimmed) { label = trimmed; break; }
		}
	}

	if (label !== null) {
		// Replace with a plain text node carrying the label. It lands under the
		// element's former parent, so an actionable parent keeps it (icon buttons:
		// <button><svg aria-label="X"/></button> -> <button>X</button>).
		elementNode.replaceWith(document.createTextNode(label));
	} else {
		// No label found anywhere — element is pure decoration. Drop it.
		elementNode.remove();
	}
}


export function preProcessDOM(domRoot: Element, document: Document, options: Partial<DOMPreProcessingOptions>): void {
	const optionsWithDefaults: DOMPreProcessingOptions = {
		uniqueIDs: false,

		...options,

		filter: {
			dataURLs: true,
			tagNames: DEFAULT_FILTER_TAG_NAMES,

			...(options.filter ?? {})
		},
		labelToText: {
			iconFonts: true,
			tagNames: DEFAULT_LABEL_TO_TEXT_TAG_NAMES,

			...(options.labelToText ?? {})
		},
	};

	const filterTagNames: Set<string> = tagNamesToNormalizedSet(optionsWithDefaults.filter?.tagNames ?? []);
	const labelToTextTagNames: Set<string> = tagNamesToNormalizedSet(optionsWithDefaults.labelToText?.tagNames ?? []);

	let i: number = 0;

	traverseDom<HTMLElement>(
		domRoot,
		NodeFilter.SHOW_ALL,
		(node: Node) => {
			if (node.nodeType === NodeType.COMMENT_NODE) {
				node.parentNode?.removeChild(node);

				return;
			}

			if (node.nodeType !== NodeType.ELEMENT_NODE) return;

			const elementNode = node as Element;

			if (filterTagNames.has(elementNode.tagName.toUpperCase())) {
				elementNode.remove();

				return;
			}

			if (optionsWithDefaults.uniqueIDs) {
				elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());

				i++;
			}

			if (optionsWithDefaults.filter?.dataURLs ?? []) {
				for (const attr of Array.from(elementNode.attributes)) {
					if (
						(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
						|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
					) continue;

					elementNode.removeAttribute(attr.name);
				}
			}

			if (labelToTextTagNames.has(elementNode.tagName.toUpperCase())) {
				// Lift accessibility labels into plain text first, so labels survive and empty wrappers do not linger.
				liftImageDescription(document, elementNode);
			}
		}
	);
}

export function postProcessDOM(domRoot: Element, options: Partial<DOMPostProcessingOptions>, isActionableElement: (elementNode: Element) => boolean): void {
	const optionsWithDefaults: DOMPostProcessingOptions = {
		filter: {
			emptyElements: true,

			...(options.filter ?? {})
		}
	};

	// Remove elements that became empty
	if (optionsWithDefaults.filter?.emptyElements ?? []) {
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
}

export function postProcessHTML(html: string, options: Partial<HTMLPostProcessingOptions>): string {
	const optionsWithDefaults: HTMLPostProcessingOptions = {
		debug: false,
		minify: true,

		...options
	};

	let processedHTML = html;

	// Minify
	if (optionsWithDefaults.minify) {
		processedHTML = processedHTML
			.replace(/\s+/g, " ")
			.replace(/>\s+</g, "><")
			.replace(/\s+>/g, ">")
			.replace(/<\s+/g, "<")
			.replace(/\s+\/>/g, "/>")
			.trim();
	}

	// Format
	if (optionsWithDefaults.debug) {
		processedHTML = formatHTML(processedHTML);
	}

	return processedHTML;
}
