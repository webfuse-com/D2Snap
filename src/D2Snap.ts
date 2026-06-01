import { GroundTruth } from "./GroundTruth.js";
import { transform } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
	NodeFilter,
	NodeType,
	type D2SnapOptions,
	type D2SnapResult,
	type D2SnapTimings,
	type DOM,
	type GroundTruthJSON,
	type HTMLElementWithDepth,
	type JSONObject,
	type TextNode
} from "./types.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { dissolveToplevelTags, formatHTML } from "./util.html.js";
import { mergeJSONs } from "./util.json.js";
import { CONFIG } from "./var.CONFIG.js";
import { GROUND_TRUTH as DEFAULT_GROUND_TRUTH } from "./var.GROUND_TRUTH.js";


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;
const WHITESPACE_REGEX: RegExp = /^\s$/;
// Void elements cannot hold children. The "custom element is a container"
// heuristic otherwise classifies unlisted void tags (e.g. <br>, <wbr>) as
// containers, and a top-down merge then moves the parent's children into the
// void target — which serialize away, destroying content. Never merge them.
const VOID_ELEMENT_TAG_NAMES: Set<string> = new Set([
	"AREA", "BASE", "BR", "COL", "EMBED", "HR", "IMG", "INPUT",
	"LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"
]);
// Markdown is re-parsed as HTML (see snapElementTextFormattingNode), so a
// markdown autolink — `<https://example.com>`, or the pointy-bracket
// destination Turndown emits for URLs containing spaces, `<https://h/a b.svg>`
// — parses into a bogus element whose tag name is the URL scheme (`https:`,
// `mailto:`). Those then act as containers and capture surrounding content.
// Scheme-only artifacts have a colon at the END of the tag name (e.g. `HTTPS:`);
// legitimate namespaced custom elements (`FB:LIKE`, `SVG:RECT`) have a local
// name after the colon and must NOT be unwrapped.
const COLON_SCHEME_TAG_REGEX: RegExp = /^[a-z][a-z0-9+.-]*:$/i;
function unwrapColonTaggedElements(parent: Node): void {
	for (const child of Array.from(parent.childNodes)) {
		if (child.nodeType !== NodeType.ELEMENT_NODE) continue;

		// Recurse first so nested artifacts (and kept content) are resolved
		// before this element is potentially unwrapped.
		unwrapColonTaggedElements(child);

		if (!COLON_SCHEME_TAG_REGEX.test((child as Element).tagName)) continue;

		while (child.firstChild) parent.insertBefore(child.firstChild, child);
		parent.removeChild(child);
	}
}


function validateParameter(name: string, value: number, allowInfinity: boolean = false) {
	if (allowInfinity && value === Infinity) return;

	if (value < 0 || value > 1) {
		throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
	}
}


export function d2Snap(
	dom: DOM,
	rE: number, rA: number, rT: number,
	options: Partial<D2SnapOptions> = {}
): D2SnapResult {
	validateParameter("rE", rE, true);
	validateParameter("rA", rA);
	validateParameter("rT", rT);

	const optionsWithDefaults: D2SnapOptions = {
		debug: false,
		groundTruth: DEFAULT_GROUND_TRUTH,
		groundTruthReplaceDefault: false,
		filterDataURLs: true,
		filteredTagNames: CONFIG.filteredTagNames,
		skipMarkdown: false,
		skipTextRank: false,
		textRankOptions: {},
		uniqueIDs: false,

		...options
	}

	const groundTruth: GroundTruth = new GroundTruth(
		!optionsWithDefaults.groundTruthReplaceDefault
			? mergeJSONs(DEFAULT_GROUND_TRUTH, optionsWithDefaults.groundTruth as JSONObject) as GroundTruthJSON
			: optionsWithDefaults.groundTruth as GroundTruthJSON
	);

	const turndown: Turndown = new Turndown(
		groundTruth.getElementsByType("actionable")
	);

	const filteredTagNames: Set<string> = new Set(
		optionsWithDefaults.filteredTagNames.map(t => t.toUpperCase())
	);

	function snapElementContainerNode(document: Document, elementNode: HTMLElementWithDepth, rE: number, domTreeHeight: number) {
		if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if (!groundTruth.isElementType("container", elementNode.tagName)) return;
		if (VOID_ELEMENT_TAG_NAMES.has(elementNode.tagName)) return;
		if (!elementNode.parentElement || !groundTruth.isElementType("container", elementNode.parentElement.tagName)) return;

		// merge
		const mergeLevels: number = Math.max(
			Math.round(domTreeHeight * (Math.min(1, rE))),
			1
		);
		if ((elementNode.depth - 1) % mergeLevels === 0) return;

		const elements = [
			elementNode.parentElement as HTMLElementWithDepth,
			elementNode
		];

		const isTopdownMerge = (
			groundTruth.getContainerRating(elements[0].tagName)
			< groundTruth.getContainerRating(elements[1].tagName)
		);
		isTopdownMerge && elements.reverse();

		const targetElement: HTMLElementWithDepth = elements[0];
		const sourceElement: HTMLElementWithDepth = elements[1];

		if (isTopdownMerge) {
			const mergedAttributes = Array.from(targetElement.attributes);

			for (const attr of sourceElement.attributes) {
				if (mergedAttributes.some(targetAttr => targetAttr.name === attr.name)) continue;
				mergedAttributes.push(attr);
			}
			for (const attr of targetElement.attributes) {
				targetElement.removeAttribute(attr.name);
			}
			for (const attr of mergedAttributes) {
				// Framework attributes carry names that violate the DOM Name
				// production (Vue `@click`/`:href`, Angular `*ngIf`), and
				// setAttribute throws InvalidCharacterError on them. Skip the
				// offending attribute rather than aborting the whole snapshot —
				// such bound attributes hold no value for a static snapshot.
				try {
					targetElement.setAttribute(attr.name, attr.value);
				} catch (e) {
					if (!(e instanceof DOMException) || e.name !== "InvalidCharacterError") throw e;
					/* invalid attribute name — drop it */
				}
			}
		}

		if (!isTopdownMerge) {
			while (sourceElement.childNodes.length) {
				targetElement
					.insertBefore(sourceElement.childNodes[0], sourceElement);
			}
		} else {
			const before: ChildNode[] = [];
			const after: ChildNode[] = [];

			let isAfterTarget: boolean = false;
			for (const child of sourceElement.childNodes) {
				if (child === targetElement) {
					isAfterTarget = true;

					continue;
				}

				(
					isAfterTarget
						? after
						: before
				)
					.push(child);
			}

			for (let i = before.length - 1; i >= 0; i--) {
				const child: ChildNode = before[i];

				if (targetElement.childNodes.length && (i === (before.length - 1))) {
					if (child.nodeType === NodeType.TEXT_NODE) {
						child.textContent = `${child.textContent} `;
					} else {
						child.appendChild(document.createTextNode(" "));
					}
				}

				targetElement.insertBefore(child, targetElement.firstChild);
			}
			for (let i = 0; i < after.length; i++) {
				const child: ChildNode = after[i];

				if (targetElement.childNodes.length && (i === 0)) {
					if (child.nodeType === NodeType.TEXT_NODE) {
						child.textContent = ` ${child.textContent}`;
					} else {
						child.insertBefore(document.createTextNode(" "), child.firstChild);
					}
				}

				targetElement.appendChild(child);
			}

			targetElement.depth = sourceElement.depth!;

			sourceElement
				.parentNode
				?.insertBefore(targetElement, sourceElement);
		}

		sourceElement
			.parentNode
			?.removeChild(sourceElement);
	}

	function snapElementReplaceWithLabelNode(document: Document, elementNode: HTMLElement) {
		if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if (!groundTruth.isElementType("replaceWithLabel", elementNode.tagName)) return;

		// Find an accessibility label, preferring attributes over child elements.
		// Attribute order is taken from the ground truth (default: aria-label, title, alt).
		let label: string | null = null;
		for (const attrName of groundTruth.getLabelAttrs()) {
			const value: string | null = elementNode.getAttribute(attrName);
			const trimmed: string = (value ?? "").trim();
			if (trimmed) { label = trimmed; break; }
		}
		if (!label) {
			for (const child of Array.from(elementNode.children)) {
				if (!groundTruth.isLabelChildTag(child.tagName)) continue;
				const trimmed: string = (child.textContent ?? "").trim();
				if (trimmed) { label = trimmed; break; }
			}
		}

		if (label !== null) {
			// Replace element with a single text node carrying the label.
			// Subsequent passes (snapTextNode etc.) will see this as plain text;
			// because it ends up under the replaceWithLabel element's former parent,
			// if that parent is actionable, TextRank will skip it (good for icon
			// buttons: <button><svg aria-label="X"/></button> -> <button>X</button>).
			elementNode.replaceWith(document.createTextNode(label));
		} else {
			// No label found anywhere — element is pure decoration. Drop it.
			elementNode.remove();
		}
	}

	function snapElementTextFormattingNode(document: Document, elementNode: HTMLElement) {
		if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if (!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
		if (optionsWithDefaults.skipMarkdown) return;

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
		if (textNode.nodeType !== NodeType.TEXT_NODE) return;

		const text: string | null = (textNode?.innerText ?? textNode.textContent);
		if (!(text ?? "").trim().length) return;

		const leadingSpace: string = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
		const trailingSpace: string = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";

		textNode.textContent = [
			leadingSpace,
			transform(text, (1 - rT), optionsWithDefaults.skipTextRank, true, optionsWithDefaults.textRankOptions),
			trailingSpace
		].join("");
	}

	function snapAttributeNode(elementNode: HTMLElement, rA: number) {
		if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;

		for (const attr of Array.from(elementNode.attributes)) {
			if (groundTruth.getAttributeRating(attr.name) >= rA) continue;

			elementNode.removeAttribute(attr.name);
		}
	}

	const document = resolveDocument(dom);
	if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

	const rootElement: Element = resolveRoot(dom)
	const originalSize = rootElement.innerHTML.length;

	const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
	let t0: number = t();
	const timings: D2SnapTimings = { uniqueIDs: 0, clone: 0, init: 0, replaceWithLabel: 0, textNodes: 0, textFormatting: 0, containers: 0, attributes: 0, serialize: 0, minify: 0, formatDebugOnly: 0 };

	let n = 0;
	optionsWithDefaults.uniqueIDs
		&& traverseDom<Element>(
			rootElement,
			NodeFilter.SHOW_ELEMENT,
			elementNode => {
				if (
					!groundTruth.isElementType("container", elementNode.tagName)
					&& !groundTruth.isElementType("actionable", elementNode.tagName)
				) return;

				elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
			}
		);
	timings.uniqueIDs = t() - t0;

	t0 = t();
	const virtualDom = rootElement.cloneNode(true) as HTMLElement;
	timings.clone = t() - t0;

	let domTreeHeight: number = 0;
	traverseDom<Node>(
		virtualDom,
		NodeFilter.SHOW_ALL,
		(node: Node) => {
			if (node.nodeType === NodeType.COMMENT_NODE) {
				node.parentNode?.removeChild(node);

				return;
			}

			if (node.nodeType !== NodeType.ELEMENT_NODE) return;

			const elementNode = node as Element;

			if (filteredTagNames.has(elementNode.tagName.toUpperCase())) {
				elementNode.remove();

				return;
			}

			for (const attr of Array.from(elementNode.attributes)) {
				if (
					(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
					|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
				) continue;

				elementNode.removeAttribute(attr.name);
			}

			const depth: number = ((elementNode.parentNode as HTMLElementWithDepth).depth ?? 0) + 1;

			(elementNode as HTMLElementWithDepth).depth = depth;

			domTreeHeight = Math.max(depth, domTreeHeight);
		}
	);
	timings.init = t() - t0;

	// Labeled-extract element nodes first: lift accessibility labels out of
	// elements like <svg>/<canvas> and into the surrounding context as plain
	// text. Done before TextRank so the lifted label survives downstream
	// passes; done before container merging so empty svg wrappers don't
	// linger around an actionable parent (e.g. icon buttons).
	// Guard: skip the full DOM walk when no tag names are configured (the
	// default ground truth ships with an empty list).
	t0 = t();
	if (groundTruth.getElementsByType("replaceWithLabel").length) {
		traverseDom<HTMLElement>(
			virtualDom,
			NodeFilter.SHOW_ELEMENT,
			(node: HTMLElement) => snapElementReplaceWithLabelNode(document, node),
		);
	}
	timings.replaceWithLabel = t() - t0;

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
		(node: HTMLElementWithDepth) => {
			if (!groundTruth.isElementType("container", node.tagName)) return;

			return snapElementContainerNode(document, node, rE, domTreeHeight);
		}
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
	// Dissolve toplevel tags for 'infinite' element downsampling ratio
	if (rE === Infinity) {
		html = dissolveToplevelTags(html);
	}
	timings.minify = t() - t0;
	// Format if is debug mode
	if (optionsWithDefaults.debug) {
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
