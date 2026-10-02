import { transformWithTextRank } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
	NodeFilter,
	NodeType,
	type D2SnapOptions,
	type D2SnapResult,
	type DOM,
	type HTMLElementWithDepth,
	type TextNode
} from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import {
	DEFAULT_ATTRIBUTE_SCORES
} from "./var.DEFAULTS_ATTRIBUTE_SCORES.js";
import {
	DEFAULT_FILTER_ATTRIBUTE_NAMES,
	DEFAULT_NORMALIZE_ATTRIBUTE_ICONFONT_VALUES,
	DEFAULT_NORMALIZE_LABEL_ATTRIBUTE_NAMES
} from "./var.DEFAULTS_ATTRIBUTES.js";
import {
	DEFAULT_CLASS_ACTIONABLE_TAG_NAMES,
	DEFAULT_CLASS_TEXT_TAG_NAMES,
	DEFAULT_FILTER_TAG_NAMES
} from "./var.DEFAULTS_TAGS.js";
import { ACTIONABLE_ROLE_ATTRIBUTE_VALUES as ACTIONABLE_ROLE_ATTRIBUTE_VALUES_ARRAY } from "./var.SEMANTICS_ATTRIBUTES.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { isInlineElement, isVoidElement } from "./util.html.js";
import { postProcessDOM, postProcessHTML, preProcessDOM } from "./D2Snap.processing.js";
import { deepMerge } from "./util.obj.js";


const WHITESPACE_REGEX: RegExp = /^\s$/;
// Markdown autolinks re-parse (see snapElementTextFormattingNode) into bogus
// elements tagged with the URL scheme — `<https://x>` -> `HTTPS:` (parser stops
// at `/`), `<mailto:x@y.com>` -> `MAILTO:X@Y.COM` (no `/`, whole URI folds in).
// Both act as containers and swallow siblings, so both must be unwrapped. The
// negative lookahead spares real namespaced custom elements (`FB:LIKE`), whose
// tail after `:` is a valid NCName.
const COLON_SCHEME_TAG_REGEX: RegExp = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
const ACTIONABLE_ROLE_ATTRIBUTE_VALUES: Set<string> = new Set(
	ACTIONABLE_ROLE_ATTRIBUTE_VALUES_ARRAY.map(t => t.toLowerCase())
);

function validateUnitParameter(name: string, value: number) {
	if(value < 0 || value > 1) {
		throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
	}
}


export function getAttributeScore(attrName: string, attributeScores: Map<string, number> = new Map(
	Object.entries(DEFAULT_ATTRIBUTE_SCORES)
		.map((entry: [ string, number ]) => [ entry[0].toLowerCase(), entry[1] ])
)) {
	let normalizedName: string = attrName;

	if(!attributeScores.has(normalizedName)) {
		if(normalizedName.includes("-")) {
			normalizedName = `${normalizedName.split("-").slice(0, -1).join("-")}-*`;
		}
	}

	const attributeScore: number = attributeScores.get(normalizedName.toLowerCase())
		?? attributeScores.get(CONFIG.attributeScoresFallbackKey)
		?? CONFIG.attributeScoresDefaultFallbackValue;

	return attributeScore;
}

export function isActionableElement(
	elementNode: Element,
	actionableElementTagNames: Set<string> = new Set(DEFAULT_CLASS_ACTIONABLE_TAG_NAMES),
	actionableRoleAttributeValues: Set<string> = ACTIONABLE_ROLE_ATTRIBUTE_VALUES
): boolean {
	return (
		actionableElementTagNames.has(elementNode.tagName.toUpperCase())
		|| actionableRoleAttributeValues.has(elementNode.getAttribute("role")?.toLowerCase() ?? "")
	);
}

export function d2Snap(
	dom: DOM,
	rE: number, rA: number, rT: number,
	options: Partial<D2SnapOptions> = {}
): D2SnapResult {
	validateUnitParameter("rE", rE);
	validateUnitParameter("rA", rA);
	validateUnitParameter("rT", rT);

	const document = resolveDocument(dom);
	if(!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

	const rootElement: Element = resolveRoot(dom)
	const originalSize = rootElement.innerHTML.length;
	const optionsWithDefaults: D2SnapOptions = deepMerge<D2SnapOptions, Partial<D2SnapOptions>>({
		attributeScores: DEFAULT_ATTRIBUTE_SCORES,
		classification: {
			actionableElements: DEFAULT_CLASS_ACTIONABLE_TAG_NAMES,
			textElements: DEFAULT_CLASS_TEXT_TAG_NAMES
		},
		debug: false,
		filter: {
			attributes: DEFAULT_FILTER_ATTRIBUTE_NAMES,
			dataURLs: true,
			elements: DEFAULT_FILTER_TAG_NAMES,
			emptyElements: true
		},
		minify: true,
		normalize: {
			iconfontsFromNames: DEFAULT_NORMALIZE_ATTRIBUTE_ICONFONT_VALUES,
			labelsFromAttributes: DEFAULT_NORMALIZE_LABEL_ATTRIBUTE_NAMES,
			svgToImg: true
		},
		skip: {
			markdown: false,
			textRank: false
		},
		uniqueIDs: false
	}, options);
	// Aliases
	optionsWithDefaults.attributeScoring = optionsWithDefaults.attributeScores;

	const attributeScores: Map<string, number> = new Map(
		Object.entries(optionsWithDefaults.attributeScores)
			.map((entry: [ string, number ]) => [ entry[0].toLowerCase(), entry[1] ])
	);

	const actionableElementTagNames: Set<string> = new Set(
		(optionsWithDefaults.classification?.actionableElements ?? [])
			.map((tagName: string) => tagName.toUpperCase())
	);
	const textElementTagNames: Set<string> = new Set(
		(optionsWithDefaults.classification?.textElements ?? [])
			.map((tagName: string) => tagName.toUpperCase())
	);

	const _isActionableElement = (elementNode: Element) => {
		return isActionableElement(elementNode, actionableElementTagNames);
	};

	const turndown: Turndown = new Turndown([ _isActionableElement ]);

	function snapElementContainerNode(elementNode: HTMLElementWithDepth, rE: number) {
		const considerContainerElement = (elementNode: Element) => {
			if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return false;
			if(_isActionableElement(elementNode)) return false;
			if(isVoidElement(elementNode.tagName)) return false;

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
		if(optionsWithDefaults.skip?.markdown) return;
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(_isActionableElement(elementNode)) return;
		if(!textElementTagNames.has(elementNode.tagName.toUpperCase())) return;

		// Markdown
		const markdown = turndown.translate(elementNode.outerHTML);
		const markdownNodesFragment = document
			.createRange()
			.createContextualFragment(markdown);

		const replacingNodes: Node[] = [...markdownNodesFragment.childNodes];

		elementNode
			  .replaceWith(...[ document.createTextNode(" "), ...replacingNodes, document.createTextNode(" ") ]);

		// Strip same-tag replacements before returning for re-traversal:
		// Turndown passes some textFormatting elements through verbatim
		// (e.g. <table> without <thead>), and re-visiting them would feed
		// the same input back to Turndown forever.
		const sourceTagName: string = elementNode.tagName.toLowerCase();

		// Drop bogus `<scheme:>` elements the HTML parser synthesises from
		// markdown autolinks before they enter the tree (and become containers).
		const unwrapColonTaggedElements = (parent: Node) => {
			for(const child of [ ...parent.childNodes ]) {
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
		};
		unwrapColonTaggedElements(markdownNodesFragment);

		return replacingNodes
			.filter(n => (
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
			transformWithTextRank(text, (1 - rT), !!optionsWithDefaults.skip?.textRank, true, optionsWithDefaults.textRankOptions),
			trailingSpace
		].join("");
	}

	function snapAttributeNode(elementNode: HTMLElement, rA: number) {
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;

		for(const attr of Array.from(elementNode.attributes)) {
			if(getAttributeScore(attr.name, attributeScores) >= rA) continue;

			elementNode.removeAttribute(attr.name);
		}
	}

	const t = optionsWithDefaults.debug
		? performance.now.bind(performance)
		: () => 0;

	let t0: number;
	const timings: D2SnapResult["meta"]["timings"] = {};

	if(optionsWithDefaults.uniqueIDs) {
		let i: number = 0;
		traverseDom<Node>(
			rootElement,
			NodeFilter.SHOW_ELEMENT,
			(node: Node) => {
				const elementNode = node as Element;

				if(isInlineElement(elementNode.tagName) && isVoidElement(elementNode.tagName)) return;

				elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());

				i++;
			}
		);
	}

	// Clone
	t0 = t();
	const virtualDom = rootElement.cloneNode(true) as HTMLElement;
	timings.clone = t() - t0;

	// Pre-process
	t0 = t();
	preProcessDOM(virtualDom, document, {
		filter: optionsWithDefaults.filter,
		normalize: optionsWithDefaults.normalize
	});
	timings.preProcessing = t() - t0;

	// Write depth per node
	t0 = t();
	let domTreeHeight: number = 0;
	traverseDom<Node>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: Node) => {
			const depth: number = ((node.parentNode as HTMLElementWithDepth).depth ?? 0) + 1;

			(node as HTMLElementWithDepth).depth = depth;

			domTreeHeight = Math.max(depth, domTreeHeight);
		}
	);
	timings.writeDepth = t() - t0;

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
	// ! Designated no-op !

	// Dissolve toplevel tags for rE = 1 (allows full linearization)
	if(rE === 1.0) {
		[ ...virtualDom.querySelectorAll("*") ]
			.filter((elementNode: Element) => !_isActionableElement(elementNode))
			.forEach((element: Element) => {
				element.replaceWith(...element.childNodes);
			});
	}

	// Post-process (DOM)
	t0 = t();
	postProcessDOM(virtualDom, {
		filter: optionsWithDefaults.filter,
		minify: optionsWithDefaults.minify
	}, _isActionableElement);
	timings.domPostProcessing = t() - t0;

	const serialisation: {
		innerHTML?: string;
		outerHTML?: string;
	} = {};
	const getHTML = (property: "innerHTML" | "outerHTML"): string => {
		if(serialisation[property]) return serialisation[property];

		// Serialize
		t0 = t();
		let html = virtualDom[property];
		timings.serialize = t() - t0;

		// Post-process (HTML)
		t0 = t();
		html = postProcessHTML(html, {
			debug: optionsWithDefaults.debug
		});
		timings.htmlPostProcessing = t() - t0;

		serialisation[property] = html;

		return html;
	};

	return {
		dom: virtualDom,
		get html() {
			return getHTML("innerHTML");
		},
		get innerHTML() {
			return getHTML("innerHTML");
		},
		get outerHTML() {
			return getHTML("outerHTML");
		},
		meta: {
			originalSize,
			get snapshotSize() {
				return getHTML("innerHTML").length;
			},
			get sizeRatio() {
				return getHTML("innerHTML").length / originalSize
			},
			tokenEstimate: Math.round(getHTML("innerHTML").length / 4),	// according to https://platform.openai.com/tokenizer

			...(optionsWithDefaults.debug && { timings })
		}
	};
}