import { NodeFilter, Node, TextNode, HTMLElementWithDepth, DOM, D2SnapOptions, D2SnapResult } from "./types.js";
import { traverseDom, resolveDocument, resolveRoot } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { isElementType, getContainerRating, getAttributeRating } from "./ground-truth.js";
import { relativeTextRank } from "./TextRank.js";
import { KEEP_LINE_BREAK_MARK, turndown } from "./Turndown.js";

import CONFIG from "../variables/config.json" with { type: "json" };


const PRE_FILTER_TAG_NAMES = [
    "SCRIPT",
    "STYLE",
    "LINK"
];


async function validateParameter(name: string, value: number, allowInfinity: boolean = false) {
    if(allowInfinity && value === Infinity) return;

    if(value < 0 || value > 1) {
        throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
    }
}


export async function d2Snap(
    dom: DOM,
    rE: number, rA: number, rT: number,
    options: D2SnapOptions = {}
): Promise<D2SnapResult> {
    validateParameter("rE", rE, true);
    validateParameter("rA", rA);
    validateParameter("rT", rT);

    const optionsWithDefaults: D2SnapOptions = {
        debug: false,
        textRankOptions: {},
        skipMarkdown: false,
        uniqueIDs: false,

        ...options
    }

    function snapElementNode(elementNode: HTMLElement) {
        if(isElementType("container", elementNode.tagName)) return;

        if(isElementType("textFormatting", elementNode.tagName)) {
            return snapElementContentNode(elementNode);
        }
        if(isElementType("actionable", elementNode.tagName)) {
            snapElementInteractiveNode(elementNode);

            return;
        }

        elementNode
            .parentNode
            ?.removeChild(elementNode);
    }

    function snapElementContainerNode(elementNode: HTMLElementWithDepth, k: number, domTreeHeight: number) {
        if(elementNode.nodeType !== Node.ELEMENT_NODE) return;
        if(!isElementType("container", elementNode.tagName)) return;
        if(!elementNode.parentElement || !isElementType("container", elementNode.parentElement.tagName)) return;

        // merge
        const mergeLevels: number = Math.max(
            Math.round(domTreeHeight * (Math.min(1, k))),
            1
        );
        if((elementNode.depth - 1) % mergeLevels === 0) return;

        const elements = [
            elementNode.parentElement as HTMLElementWithDepth,
            elementNode
        ];

        const isTopdownMerge = (
            getContainerRating(elements[0].tagName)
            < getContainerRating(elements[1].tagName)
        );
        isTopdownMerge && elements.reverse();

        const targetEl = elements[0];
        const sourceEl = elements[1];

        if(isTopdownMerge) {
            const mergedAttributes = Array.from(targetEl.attributes);
            for(const attr of sourceEl.attributes) {
                if(mergedAttributes.some(targetAttr => targetAttr.name === attr.name)) continue;
                mergedAttributes.push(attr);
            }
            for(const attr of targetEl.attributes) {
                targetEl.removeAttribute(attr.name);
            }
            for(const attr of mergedAttributes) {
                targetEl.setAttribute(attr.name, attr.value);
            }
        }

        if(!isTopdownMerge) {
            while(sourceEl.childNodes.length) {
                targetEl
                    .insertBefore(sourceEl.childNodes[0], sourceEl);
            }
        } else {
            let afterPivot = false;
            while(sourceEl.childNodes.length > 1) {
                const childNode = sourceEl.childNodes[+afterPivot];

                if(childNode === targetEl) {
                    afterPivot = true;

                    continue;
                }

                (afterPivot || !targetEl.childNodes.length)
                    ? targetEl
                        .appendChild(childNode)
                    : targetEl
                        .insertBefore(childNode, targetEl.childNodes[0]);
            }

            targetEl.depth = sourceEl.depth!;

            sourceEl
                .parentNode
                ?.insertBefore(targetEl, sourceEl);
        }

        sourceEl
            .parentNode
            ?.removeChild(sourceEl);
    }

    function snapElementContentNode(elementNode: HTMLElement) {
        if(elementNode.nodeType !== Node.ELEMENT_NODE) return;
        if(!isElementType("textFormatting", elementNode.tagName)) return;
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
        if(!isElementType("actionable", elementNode.tagName)) return;

        // pass
    }

    function snapTextNode(textNode: TextNode, l: number) {
        if(textNode.nodeType !== Node.TEXT_NODE) return;

        const text: string = (textNode?.innerText ?? textNode.textContent);

        textNode.textContent = relativeTextRank(text, (1 - l), optionsWithDefaults.textRankOptions, true);
    }

    function snapAttributeNode(elementNode: HTMLElement, m: number) {
        if(elementNode.nodeType !== Node.ELEMENT_NODE) return;

        for(const attr of Array.from(elementNode.attributes)) {
            if(getAttributeRating(attr.name) >= m) continue;

            elementNode.removeAttribute(attr.name);
        }
    }

    const document = resolveDocument(dom);
    if(!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

    const rootElement: Element = resolveRoot(dom)
    const originalSize = rootElement.outerHTML.length;

    let n = 0;
    optionsWithDefaults.uniqueIDs
        && await traverseDom<Element>(
            document,
            rootElement,
            NodeFilter.SHOW_ELEMENT,
            elementNode => {
                if(
                    !isElementType("container", elementNode.tagName)
                    && !isElementType("actionable", elementNode.tagName)                    
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
            if(!PRE_FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;

            elementNode
                .parentNode
                ?.removeChild(elementNode);
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
            if(!isElementType("container", node.tagName)) return;

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
    let serializedHTML = optionsWithDefaults.debug
        ? formatHTML(snapshot)
        : snapshot;
    serializedHTML = serializedHTML
        .replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n")
        .replace(/\n *(\n|$)/g, "");
    serializedHTML = (
        virtualDom.children.length === 1
        && (rE === Infinity)
        && virtualDom.children.length
    )
        ? serializedHTML
            .trim()
            .replace(/^<[^>]+>\s*/, "")
            .replace(/\s*<\/[^<]+>$/, "")
        : serializedHTML;

    return {
        serializedHTML,
        meta: {
            originalSize,
            snapshotSize: snapshot.length,
            sizeRatio: snapshot.length / originalSize,
            estimatedTokens: Math.round(snapshot.length / 4)    // according to https://platform.openai.com/tokenizer
        }
    };
}