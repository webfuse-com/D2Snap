import { D2SnapOptions, NodeFilter, NodeType } from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import { minifyDOM, traverseDom } from "./util.dom.js";
import { formatHTML, isVoidElement } from "./util.html.js";


interface DOMPreProcessingOptions {
	filter: Pick<D2SnapOptions["filter"], "attributes" | "elements" | "dataURLs">;
	normalize: Pick<D2SnapOptions["normalize"], "iconfontsFromNames" | "labelsFromAttributes" | "svgToImg">;
	uniqueIDs: boolean;
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


function normalizeCaseInsensitive(str: string): string {
	return str.toUpperCase();
}

function normalizeCaseInsensitiveArrayToSet(tagNames: string[]): Set<string> {
	return new Set(
		tagNames
			.map((tagName: string) => normalizeCaseInsensitive(tagName))
	);
}

export function preProcessDOM(domRoot: Element, options: DOMPreProcessingOptions): void {
	const filterElementsTagNames: Set<string> = normalizeCaseInsensitiveArrayToSet(options.filter?.elements ?? []);
	const filterAttributesNames: Set<string> = normalizeCaseInsensitiveArrayToSet(options.filter?.attributes ?? []);

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

			if(filterElementsTagNames.has(normalizeCaseInsensitive(elementNode.tagName))) {
				elementNode.remove();

				return;
			}

			for(const attr of [ ...elementNode.attributes ]) {
				if(filterAttributesNames.has(normalizeCaseInsensitive(attr.name))) {
					elementNode.removeAttribute(attr.name);
				}
			}

			if (options.uniqueIDs) {
				elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());

				i++;
			}

			if (options.filter?.dataURLs ?? []) {
				for (const attr of Array.from(elementNode.attributes)) {
					if (
						(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
						|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
					) continue;

					elementNode.removeAttribute(attr.name);
				}
			}
		}
	);
}

export function postProcessDOM(domRoot: Element, options: DOMPostProcessingOptions, isActionableElement: (elementNode: Element) => boolean): void {
	// Remove elements that became empty
	if (options.filter?.emptyElements ?? []) {
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
	if (options.minify) {
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