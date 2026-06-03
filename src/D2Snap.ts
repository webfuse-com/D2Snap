import {
	NodeFilter,
	NodeType,
	type TextNode,
	type HTMLElementWithDepth,
	type DOM,
	type JSONObject,
	type D2SnapOptions,
	type D2SnapResult,
	type GroundTruthJSON
} from "./types.js";
import { traverseDom, resolveDocument, resolveRoot } from "./util.dom.js";
import { dissolveToplevelTags, formatHTML } from "./util.html.js";
import { mergeJSONs } from "./util.json.js";
import { GroundTruth } from "./GroundTruth.js";
import { transform } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import { CONFIG } from "./var.CONFIG.js";
import { GROUND_TRUTH as DEFAULT_GROUND_TRUTH } from "./var.GROUND_TRUTH.js";


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;
const WHITESPACE_REGEX: RegExp = /^\s$/;


function validateParameter(name: string, value: number, allowInfinity: boolean = false) {
	if(allowInfinity && value === Infinity) return;

	if(value < 0 || value > 1) {
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
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(!groundTruth.isElementType("container", elementNode.tagName)) return;
		if(!elementNode.parentElement || !groundTruth.isElementType("container", elementNode.parentElement.tagName)) return;

		// merge
		const mergeLevels: number = Math.max(
			Math.round(domTreeHeight * (Math.min(1, rE))),
			1
		);
		if((elementNode.depth - 1) % mergeLevels === 0) return;

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

		if(isTopdownMerge) {
			const mergedAttributes = Array.from(targetElement.attributes);

			for(const attr of sourceElement.attributes) {
				if(mergedAttributes.some(targetAttr => targetAttr.name === attr.name)) continue;
				mergedAttributes.push(attr);
			}
			for(const attr of targetElement.attributes) {
				targetElement.removeAttribute(attr.name);
			}
			for(const attr of mergedAttributes) {
				targetElement.setAttribute(attr.name, attr.value);
			}
		}

		if(!isTopdownMerge) {
			while(sourceElement.childNodes.length) {
				targetElement
                    .insertBefore(sourceElement.childNodes[0], sourceElement);
			}
		} else {
			const before: ChildNode[] = [];
			const after: ChildNode[]  = [];

			let isAfterTarget: boolean = false;
			for(const child of sourceElement.childNodes) {
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

			for(let i = before.length - 1; i >= 0; i--) {
				const child: ChildNode = before[i];

				if(targetElement.childNodes.length && (i === (before.length - 1))) {
					if(child.nodeType === NodeType.TEXT_NODE) {
						child.textContent = `${child.textContent} `;
					} else {
						child.appendChild(document.createTextNode(" "));
					}
				}

				targetElement.insertBefore(child, targetElement.firstChild);
			}
			for(let i = 0; i < after.length; i++) {
				const child: ChildNode = after[i];

				if(targetElement.childNodes.length && (i === 0)) {
					if(child.nodeType === NodeType.TEXT_NODE) {
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

	function snapElementTextFormattingNode(document: Document, elementNode: HTMLElement) {
		if(elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
		if(!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
		if(optionsWithDefaults.skipMarkdown) return;

		// Markdown
		const markdown = turndown.translate(elementNode.outerHTML);
		const markdownNodesFragment = resolveDocument(dom)!
            .createRange()
            .createContextualFragment(markdown);

		const replacingNodes: Node[] = [...markdownNodesFragment.childNodes];

		elementNode
            .replaceWith(...[ document.createTextNode(" "), ...replacingNodes, document.createTextNode(" ") ]);

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
			if(groundTruth.getAttributeRating(attr.name) >= rA) continue;

			elementNode.removeAttribute(attr.name);
		}
	}

	const document = resolveDocument(dom);
	if(!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

	const rootElement: Element = resolveRoot(dom)
	const originalSize = rootElement.innerHTML.length;

	let n = 0;
	optionsWithDefaults.uniqueIDs
        && traverseDom<Element>(
        	rootElement,
        	NodeFilter.SHOW_ELEMENT,
        	elementNode => {
        		if(
        			!groundTruth.isElementType("container", elementNode.tagName)
                    && !groundTruth.isElementType("actionable", elementNode.tagName)                    
        		) return;

        		elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
        	}
        );

	const virtualDom = rootElement.cloneNode(true) as HTMLElement;

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

			for(const attr of Array.from(elementNode.attributes)) {
				if(
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

	// Text nodes first
	traverseDom<TextNode>(
		virtualDom,
		NodeFilter.SHOW_TEXT,
		(node: TextNode) => snapTextNode(node, rT)
	);

	// Text formatting element nodes
	traverseDom<HTMLElement>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapElementTextFormattingNode(document, node),
	);

	// Container element nodes
	traverseDom<HTMLElementWithDepth>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElementWithDepth) => {
			if(!groundTruth.isElementType("container", node.tagName)) return;

			return snapElementContainerNode(document, node, rE, domTreeHeight);
		}
	);

	// Attribute nodes
	traverseDom<HTMLElement>(
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapAttributeNode(node, rA)   // work on parent element
	);

	// Actionable element nodes
	// Designated no-op

	const snapshot = virtualDom.innerHTML;
	// Minify
	let html = snapshot
		.replace(/\s+/g, " ")
		.replace(/>\s+</g, "><")
		.replace(/\s+>/g, ">")
		.replace(/<\s+/g, "<")
		.replace(/\s+\/>/g, "/>")
		.trim();
	// Dissolve toplevel tags for 'infinite' element downsampling ratio
	if(rE === Infinity) {
		html = dissolveToplevelTags(html);
	}
	// Format if is debug mode
	if(optionsWithDefaults.debug) {
		html = formatHTML(html);
	}

	return {
		html,
		meta: {
			originalSize,
			snapshotSize: snapshot.length,
			sizeRatio: snapshot.length / originalSize,
			tokenEstimate: Math.round(snapshot.length / 4)    // according to https://platform.openai.com/tokenizer
		}
	};
}