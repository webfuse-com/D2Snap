import {
	NodeFilter,
	Node,
	type TextNode,
	type HTMLElementWithDepth,
	type DOM,
	type JSONObject,
	type D2SnapOptions,
	type D2SnapResult,
	type GroundTruthJSON
} from "./types.js";
import { traverseDom, resolveDocument, resolveRoot } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { GroundTruth } from "./GroundTruth.js";
import { relativeTextRank } from "./TextRank.js";
import { KEEP_LINE_BREAK_MARK, turndown } from "./Turndown.js";
import { CONFIG } from "./var.CONFIG.js";
import { GROUND_TRUTH as DEFAULT_GROUND_TRUTH } from "./var.GROUND_TRUTH.js";
import { mergeJSONs } from "./util.json.js";


const DATA_URL_ATTRIBUTE_NAME: string = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX: RegExp = /^data:/i;


function validateParameter(name: string, value: number, allowInfinity: boolean = false) {
	if(allowInfinity && value === Infinity) return;

	if(value < 0 || value > 1) {
		throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
	}
}


export async function d2Snap(
	dom: DOM,
	rE: number, rA: number, rT: number,
	options: Partial<D2SnapOptions> = {}
): Promise<D2SnapResult> {
	validateParameter("rE", rE, true);
	validateParameter("rA", rA);
	validateParameter("rT", rT);

	const optionsWithDefaults: D2SnapOptions = {
		debug: false,
		groundTruth: DEFAULT_GROUND_TRUTH,
		groundTruthReplaceDefault: false,
		filterDataURLs: true,
		filteredTagNames: [
			"SCRIPT",
			"STYLE",
			"LINK"
		],
		textRankOptions: {},
		skipMarkdown: false,
		uniqueIDs: false,

		...options
	}

	const groundTruth: GroundTruth = new GroundTruth(
		!optionsWithDefaults.groundTruthReplaceDefault
			? mergeJSONs(DEFAULT_GROUND_TRUTH, optionsWithDefaults.groundTruth as JSONObject) as GroundTruthJSON
			: optionsWithDefaults.groundTruth as GroundTruthJSON
	);

	function snapElementNode(elementNode: HTMLElement) {
		if(groundTruth.isElementType("container", elementNode.tagName)) return;

		if(groundTruth.isElementType("textFormatting", elementNode.tagName)) {
			return snapElementContentNode(elementNode);
		}
		if(groundTruth.isElementType("actionable", elementNode.tagName)) {
			snapElementInteractiveNode(elementNode);

			return;
		}

		elementNode
            .parentNode
            ?.removeChild(elementNode);
	}

	function snapElementContainerNode(elementNode: HTMLElementWithDepth, rE: number, domTreeHeight: number) {
		if(elementNode.nodeType !== Node.ELEMENT_NODE) return;
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
				targetElement.insertBefore(before[i], targetElement.firstChild);
			}
			for (const child of after) {
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

	function snapElementContentNode(elementNode: HTMLElement) {
		if(elementNode.nodeType !== Node.ELEMENT_NODE) return;
		if(!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
		if(optionsWithDefaults.skipMarkdown) return;

		// markdown
		const markdown = turndown(elementNode.outerHTML);
		const markdownNodesFragment = resolveDocument(dom)!
            .createRange()
            .createContextualFragment(markdown);

		elementNode
            .replaceWith(...markdownNodesFragment.childNodes);
	}

	function snapElementInteractiveNode(elementNode: HTMLElement) {
		if(elementNode.nodeType !== Node.ELEMENT_NODE) return;
		if(!groundTruth.isElementType("actionable", elementNode.tagName)) return;

		// pass
	}

	function snapTextNode(textNode: TextNode, rT: number) {
		if(textNode.nodeType !== Node.TEXT_NODE) return;

		const text: string = (textNode?.innerText ?? textNode.textContent);

		textNode.textContent = relativeTextRank(text, (1 - rT), optionsWithDefaults.textRankOptions, true);
	}

	function snapAttributeNode(elementNode: HTMLElement, rA: number) {
		if(elementNode.nodeType !== Node.ELEMENT_NODE) return;

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
        && await traverseDom<Element>(
        	document,
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

	// Prepare
	await traverseDom<Comment>(
		document,
		virtualDom,
		NodeFilter.SHOW_COMMENT,
		node => node.parentNode?.removeChild(node)
	);

	await traverseDom<Element>(
		document,
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		elementNode => {
			if(
				optionsWithDefaults
					.filteredTagNames
					.includes(elementNode.tagName.toUpperCase())
			) {
				elementNode
					.parentNode
					?.removeChild(elementNode);

				return;
			}

			for(const attr of Array.from(elementNode.attributes)) {
				if(
					(attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME)
					|| !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)
				) continue;

				elementNode.removeAttribute(attr.name);
			}
		}
	);

	let domTreeHeight: number = 0;
	await traverseDom<Element>(
		document,
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		elementNode => {
			const depth: number = ((elementNode.parentNode as HTMLElementWithDepth).depth ?? 0) + 1;

			(elementNode as HTMLElementWithDepth).depth = depth;

			domTreeHeight = Math.max(depth, domTreeHeight);
		}
	);

	// D2Snap implementation harnessing the TreeWalkers API:

	// Text nodes first
	await traverseDom<TextNode>(
		document,
		virtualDom,
		NodeFilter.SHOW_TEXT,
		(node: TextNode) => snapTextNode(node, rT)
	);

	// Non-container element nodes
	await traverseDom<HTMLElement>(
		document,
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapElementNode(node)
	);

	// Container element nodes
	await traverseDom<HTMLElementWithDepth>(
		document,
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElementWithDepth) => {
			if(!groundTruth.isElementType("container", node.tagName)) return;

			return snapElementContainerNode(node, rE, domTreeHeight);
		}
	);

	// Attribute nodes
	await traverseDom<HTMLElement>(
		document,
		virtualDom,
		NodeFilter.SHOW_ELEMENT,
		(node: HTMLElement) => snapAttributeNode(node, rA)   // work on parent element
	);

	const snapshot = virtualDom.innerHTML;
	let html = optionsWithDefaults.debug
		? formatHTML(snapshot)
		: snapshot;
	html = html
        .replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n")
        .replace(/\n *(\n|$)/g, "");
	html = (
		virtualDom.children.length === 1
        && (rE === Infinity)
        && virtualDom.children.length
	)
		? html
            .trim()
            .replace(/^<[^>]+>\s*/, "")
            .replace(/\s*<\/[^<]+>$/, "")
		: html;

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