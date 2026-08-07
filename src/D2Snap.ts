import { transform } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
	NodeFilter,
	NodeType,
	type D2SnapOptions,
	type D2SnapResult,
	type D2SnapTimings,
	type DOM,
	type HTMLElementWithDepth,
	type TextNode
} from "./types.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { CONFIG } from "./var.CONFIG.js";
import {
	FILTERED_TAG_NAMES as DEFAULT_FILTERED_TAG_NAMES,
	VOID_TAG_NAMES,
	ACTIONABLE_TAG_NAMES,
	TEXT_TAG_NAMES,
	REPLACE_WITH_LABELS_TAG_NAMES
} from "./var.CLASS_TAGS.js";
import { ACTIONABLE_ROLE_ATTRIBUTE_VALUES } from "./var.CLASS_ATTRIBUTES.js";
import { ATTRIBUTE_SCORING as DEFAULT_ATTRIBUTE_SCORING } from "./var.ATTRIBUTE_SCORING.js";


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;
const WHITESPACE_REGEX: RegExp = /^\s$/;
// Markdown autolinks re-parse (see snapElementTextFormattingNode) into bogus
// elements tagged with the URL scheme — `<https://x>` -> `HTTPS:` (parser stops
// at `/`), `<mailto:x@y.com>` -> `MAILTO:X@Y.COM` (no `/`, whole URI folds in).
// Both act as containers and swallow siblings, so both must be unwrapped. The
// negative lookahead spares real namespaced custom elements (`FB:LIKE`), whose
// tail after `:` is a valid NCName.
const COLON_SCHEME_TAG_REGEX: RegExp = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
// Void elements cannot hold children. The "custom element is a container"
// heuristic otherwise classifies unlisted void tags (e.g. <br>, <wbr>) as
// containers, and a top-down merge then moves the parent's children into the
// void target — which serialize away, destroying content. Never merge them.


function validateParameter(name: string, value: number) {
	if(value < 0 || value > 1) {
		throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
	}
}

function unwrapColonTaggedElements(parent: Node): void {
	for(const child of Array.from(parent.childNodes)) {
		if(child.nodeType !== NodeType.ELEMENT_NODE) continue;

		// Recurse first so nested artifacts (and kept content) are resolved
		// before this element is potentially unwrapped.
		unwrapColonTaggedElements(child);

		if(!COLON_SCHEME_TAG_REGEX.test((child as Element).tagName)) continue;

		while(child.firstChild) {
			parent.insertBefore(child.firstChild, child);
		}

		parent.removeChild(child);
	}
}


export function d2Snap(
	dom: DOM,
	rE: number, rA: number, rT: number,
	options: Partial<D2SnapOptions> = {}
): D2SnapResult {
	validateParameter("rE", rE);
	validateParameter("rA", rA);
	validateParameter("rT", rT);

	const optionsWithDefaults: D2SnapOptions = {
		attributeScoringFallback: 0,
		debug: false,
		filterDataURLs: true,
		filterEmptyElements: false,
		filteredTagNames: DEFAULT_FILTERED_TAG_NAMES,
		liftImageDescription: true,
		skipMarkdown: false,
		skipTextRank: false,
		textRankOptions: {},
		uniqueIDs: false,

		...options,

		attributeScoring: {
			...DEFAULT_ATTRIBUTE_SCORING,

			...(options.attributeScoring ?? {}),
		},
	};

	const attributeScoring: Map<string, number> = new Map(
		Object.entries(optionsWithDefaults.attributeScoring)
			.map((entry: [ string, number ]) => [ entry[0].toLowerCase(), entry[1] ])
	);

	const filteredTagNames: Set<string> = new Set(
		optionsWithDefaults.filteredTagNames.map(t => t.toUpperCase())
	);
	const actionableTagNames: Set<string> = new Set(
		ACTIONABLE_TAG_NAMES.map((tagName: string) => tagName.toUpperCase())
	);
	const actionableRoleAttributeValues: Set<string> = new Set(
		ACTIONABLE_ROLE_ATTRIBUTE_VALUES.map(t => t.toLowerCase())
	);

	function hasMDRetainTagName(elementNode: Element): boolean {
		return actionableTagNames.has(elementNode.tagName.toUpperCase());
	}
	function hasActionableRole(elementNode: Element): boolean {
		return actionableRoleAttributeValues.has(elementNode.getAttribute("role")?.toLowerCase() ?? "");
	}

	const turndown: Turndown = new Turndown([ hasMDRetainTagName, hasActionableRole ]);

	function snapElementContainerNode(elementNode: HTMLElementWithDepth, rE: number) {
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(hasActionableRole(elementNode)) return;
		if(ACTIONABLE_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
		if(VOID_TAG_NAMES.has(elementNode.tagName.toUpperCase())) return;

		const considerContainerElement = (elementNode: Element) => {
			if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return false;
			if(hasActionableRole(elementNode)) return false;

			const tagName: string = elementNode.tagName.toUpperCase();

			if(VOID_TAG_NAMES.has(tagName)) return false;
			if(ACTIONABLE_TAG_NAMES.includes(tagName)) return false;

			return true;
		};

		if(!considerContainerElement(elementNode)) return;
		if(!elementNode.parentElement || !considerContainerElement(elementNode.parentElement)) return;

		// Merge (Bresenham gate)
		const ratio = Math.min(1, Math.max(0, rE));
		const isMergeLevel = (elementNode.depth > 1) && (Math.floor(elementNode.depth * ratio) > Math.floor((elementNode.depth - 1) * ratio));
		if(!isMergeLevel) return;

		const targetElement: HTMLElementWithDepth = elementNode.parentElement as HTMLElementWithDepth;
		const sourceElement: HTMLElementWithDepth = elementNode;

		while(sourceElement.childNodes.length) {
			targetElement
				.insertBefore(sourceElement.childNodes[0], sourceElement);
		}

		sourceElement
			.parentNode
			?.removeChild(sourceElement);
	}

	function snapElementTextFormattingNode(document: Document, elementNode: HTMLElement) {
		if(optionsWithDefaults.skipMarkdown) return;
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(hasActionableRole(elementNode)) return;
		if(!TEXT_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;

		// Markdown
		const markdown = turndown.translate(elementNode.outerHTML);
		const markdownNodesFragment = resolveDocument(dom)!
			.createRange()
			.createContextualFragment(markdown);

		// Drop bogus `<scheme:>` elements the HTML parser synthesises from
		// markdown autolinks before they enter the tree (and become containers).
		unwrapColonTaggedElements(markdownNodesFragment);

		const replacingNodes: Node[] = [...markdownNodesFragment.childNodes];

		elementNode
			  .replaceWith(...[document.createTextNode(" "), ...replacingNodes, document.createTextNode(" ")]);

		// Strip same-tag replacements before returning for re-traversal:
		// Turndown passes some textFormatting elements through verbatim
		// (e.g. <table> without <thead>), and re-visiting them would feed
		// the same input back to Turndown forever.
		const sourceTagName: string = elementNode.tagName.toLowerCase();

		return replacingNodes.filter(n => (
			(n.nodeType !== NodeType.ELEMENT_NODE)
            || ((n as Element).tagName.toLowerCase() !== sourceTagName)
		));
	}

	function snapTextNode(textNode: TextNode, rT: number) {
		if(textNode.nodeType !== NodeType.TEXT_NODE) return;

		const text: string | null = (textNode?.innerText ?? textNode.textContent);
		if(!(text ?? "").trim().length) return;

		const leadingSpace: string = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
		const trailingSpace: string = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";

		textNode.textContent = [
			leadingSpace,
			transform(text, (1 - rT), optionsWithDefaults.skipTextRank, true, optionsWithDefaults.textRankOptions),
			trailingSpace
		].join("");
	}

	function snapAttributeNode(elementNode: HTMLElement, rA: number) {
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;

		for(const attr of Array.from(elementNode.attributes)) {
			let normalizedName: string = attr.name;

			if(!attributeScoring.has(normalizedName)) {
				if(normalizedName.includes("-")) {
					normalizedName = `${normalizedName.split("-").slice(0, -1).join("-")}-*`;
				}
			}

			const attributeScore: number = attributeScoring.get(normalizedName.toLowerCase()) ?? optionsWithDefaults.attributeScoringFallback;
			if(attributeScore >= rA) continue;

			elementNode.removeAttribute(attr.name);
		}
	}

	function liftImageDescription(document: Document, elementNode: HTMLElement) {
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(!REPLACE_WITH_LABELS_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;

		// Find an accessibility label, preferring attributes over child elements.
		// Attribute order is taken from the UI feature heuristics (default: aria-label, title, alt).
		let label: string | null = null;
		for(const attrName of [ "aria-label", "title", "alt" ]) {
			const value: string | null = elementNode.getAttribute(attrName);
			const trimmed: string = (value ?? "").trim();
			if(trimmed) { label = trimmed; break; }
		}
		if(!label) {
			for(const child of Array.from(elementNode.children)) {
				if(!["title", "desc"].includes(child.tagName)) continue;
				const trimmed: string = (child.textContent ?? "").trim();
				if(trimmed) { label = trimmed; break; }
			}
		}

		if(label !== null) {
			// Replace with a plain text node carrying the label. It lands under the
			// element's former parent, so an actionable parent keeps it (icon buttons:
			// <button><svg aria-label="X"/></button> -> <button>X</button>).
			elementNode.replaceWith(document.createTextNode(label));
		} else {
			// No label found anywhere — element is pure decoration. Drop it.
			elementNode.remove();
		}
	}

	const document = resolveDocument(dom);
	if(!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

	const rootElement: Element = resolveRoot(dom)
	const originalSize = rootElement.innerHTML.length;

	const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;

	let t0: number;
	const timings: D2SnapTimings = {
		uniqueIDs: 0, 
		clone: 0,
		init: 0,
		liftImageDescription: 0,
		textNodes: 0,
		textFormatting: 0,
		containers: 0,
		attributes: 0,
		serialize: 0,
		minify: 0,
		formatDebugOnly: 0
	};

	t0 = t();
	const virtualDom = rootElement.cloneNode(true) as HTMLElement;
	timings.clone = t() - t0;

	// Write depth per node.
	// Remove noise.
	let domTreeHeight: number = 0;
	traverseDom<Node>(
		virtualDom,
		NodeFilter.SHOW_ALL,
		(node: Node) => {
			if(node.nodeType === NodeType.COMMENT_NODE) {
				node.parentNode?.removeChild(node);

				return;
			}

			if(node.nodeType !== NodeType.ELEMENT_NODE) return;

			const elementNode = node as Element;

			if(filteredTagNames.has(elementNode.tagName.toUpperCase())) {
				elementNode.remove();

				return;
			}

			if(optionsWithDefaults.filterDataURLs) {
				for(const attr of Array.from(elementNode.attributes)) {
					if(
						(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
						|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
					) continue;

					elementNode.removeAttribute(attr.name);
				}
			}

			const depth: number = ((elementNode.parentNode as HTMLElementWithDepth).depth ?? 0) + 1;

			(elementNode as HTMLElementWithDepth).depth = depth;

			domTreeHeight = Math.max(depth, domTreeHeight);
		}
	);
	timings.init = t() - t0;

	// Optionally assign unique IDs.
	let n = 0;
	optionsWithDefaults.uniqueIDs
		&& traverseDom<Element>(
			rootElement,
			NodeFilter.SHOW_ELEMENT,
			elementNode => {
				elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
			}
		);
	timings.uniqueIDs = t() - t0;

	// Lift accessibility labels into plain text first, so labels survive and empty wrappers do not linger.
	t0 = t();
	optionsWithDefaults.liftImageDescription
	&& traverseDom<HTMLElement>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => liftImageDescription(document, node),
	);
	timings.liftImageDescription = t() - t0;

	// Text nodes
	t0 = t();
	traverseDom<TextNode>(
		virtualDom,
		NodeFilter.SHOW_TEXT,
		(node: TextNode) => snapTextNode(node, rT)
	);
	timings.textNodes = t() - t0;

	// Text formatting element nodes
	t0 = t();
	traverseDom<HTMLElement>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapElementTextFormattingNode(document, node),
	);
	timings.textFormatting = t() - t0;

	// Container element nodes
	t0 = t();
	traverseDom<HTMLElementWithDepth>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElementWithDepth) => snapElementContainerNode(node, rE),
	);
	timings.containers = t() - t0;

	// Attribute nodes
	t0 = t();
	traverseDom<HTMLElement>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapAttributeNode(node, rA)   // work on parent element
	);
	timings.attributes = t() - t0;

	// Actionable element nodes
	// Designated no-op

	// Remove elements that became empty
	if(optionsWithDefaults.filterEmptyElements) {
		let hasRemovedElement: boolean;

		do {
			hasRemovedElement = false;

			traverseDom<HTMLElement>(
				virtualDom,
				NodeFilter.SHOW_ELEMENT,
				(elementNode: HTMLElement) => {
					if(ACTIONABLE_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
					if(hasActionableRole(elementNode)) return;
					if(elementNode.children.length || elementNode.textContent.trim().length) return;

					elementNode.remove();

					hasRemovedElement = true;
				}
			);
		} while(hasRemovedElement);
	}

	// Dissolve toplevel tags for rE = 1 (allows full linearization)
	if(rE === 1.0) {
		const dissolveToplevelTags = (rootElement: Element) => {
			[ ...rootElement.children ]
				.forEach((element: Element) => {
					element.replaceWith(...element.childNodes);
				});
		};

		dissolveToplevelTags(virtualDom);

		[
			...virtualDom.querySelectorAll(ACTIONABLE_TAG_NAMES.join(", ")),
			...virtualDom.querySelectorAll(
				[ ...ACTIONABLE_ROLE_ATTRIBUTE_VALUES ].map((role: string) => `[role="${role}"]`).join(", ")
			)
		]
			.forEach((actionableElement: Element) => dissolveToplevelTags(actionableElement));
	}

	t0 = t();
	const snapshot = virtualDom.innerHTML;
	timings.serialize = t() - t0;

	// Minify
	t0 = t();
	let html = snapshot
		.replace(/\s+/g, " ")
		.replace(/>\s+</g, "><")
		.replace(/\s+>/g, ">")
		.replace(/<\s+/g, "<")
		.replace(/\s+\/>/g, "/>")
		.trim();
	timings.minify = t() - t0;

	// Format if is debug mode
	if(optionsWithDefaults.debug) {
		t0 = t();
		html = formatHTML(html);
		timings.formatDebugOnly = t() - t0;
	}

	return {
		html,
		meta: {
			originalSize,
			snapshotSize: snapshot.length,
			sizeRatio: snapshot.length / originalSize,
			tokenEstimate: Math.round(snapshot.length / 4),    // according to https://platform.openai.com/tokenizer

			...(optionsWithDefaults.debug && { timings })
		}
	};
}