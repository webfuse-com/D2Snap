import { TextNode, HTMLElementDepth, DOM, D2SnapOptions, Snapshot, NodeFilter, Node } from "./D2Snap.types.ts";
import { formatHtml, traverseDom, resolveDocument, resolveRoot } from "./util.ts";
import { getAttributeSemantics, getContainerSemantics, isElementType } from "./ground-truth.ts";
import { relativeTextRank } from "./TextRank.ts";
import { KEEP_LINE_BREAK_MARK, turndown } from "./Turndown.ts";
import * as d2SnapUtil from "./D2Snap.util.ts";

import CONFIG from "./config.json" with { type: "json" };


const FILTER_TAG_NAMES = [
    "SCRIPT",
    "STYLE",
    "LINK"
];


export async function d2Snap(
    dom: DOM,
    k: number, l: number, m: number,
    options: D2SnapOptions = {}
): Promise<Snapshot> {
    d2SnapUtil.validateParams(k, l, m);

    const optionsWithDefaults = d2SnapUtil.getOptionsWithDefaults(options);

    function snapElementNode(elementNode: HTMLElement) {
        if(isElementType("container", elementNode.tagName)) return;

        if(isElementType("content", elementNode.tagName)) {
            return snapElementContentNode(elementNode);
        }
        if(isElementType("interactive", elementNode.tagName)) {
            snapElementInteractiveNode(elementNode);

            return;
        }

        if(optionsWithDefaults.keepUnknownElements) return;

        elementNode
            .parentNode
            ?.removeChild(elementNode);
    }

    function snapElementContainerNode(elementNode: HTMLElementDepth, k: number, domTreeHeight: number) {
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
            elementNode.parentElement as HTMLElementDepth,
            elementNode
        ];

        const mergeUpwards = (
                getContainerSemantics(elements[0].tagName)
            >= getContainerSemantics(elements[1].tagName)
        );
        !mergeUpwards && elements.reverse();

        const targetEl = elements[0];
        const sourceEl = elements[1];

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

        if(mergeUpwards) {
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
        if(!isElementType("content", elementNode.tagName)) return;
        if(optionsWithDefaults.skipMarkdownTranslation) return;

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
        if(!isElementType("interactive", elementNode.tagName)) return;

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
            if(getAttributeSemantics(attr.name) >= m) continue;

            elementNode.removeAttribute(attr.name);
        }
    }

    const document = resolveDocument(dom);
    if(!document) throw new ReferenceError("Could not resolve a valid document object from DOM");

    const rootElement: HTMLElement = resolveRoot(dom)
    const originalSize = rootElement.outerHTML.length;

    let n = 0;
    optionsWithDefaults.assignUniqueIDs
        && await traverseDom<Element>(
            document,
            rootElement,
            NodeFilter.SHOW_ELEMENT,
            elementNode => {
                if(
                    !isElementType("container", elementNode.tagName)
                    && !isElementType("interactive", elementNode.tagName)                    
                ) return;

                elementNode.setAttribute(CONFIG.uniqueIDAttribute, (n++).toString());
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
            if(!FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;

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
            const depth: number = ((elementNode.parentNode as HTMLElementDepth).depth ?? 0) + 1;

            (elementNode as HTMLElementDepth).depth = depth;

            domTreeHeight = Math.max(depth, domTreeHeight);
        }
    );

    // D2Snap implementation harnessing the power of the TreeWalkers API:

    // Text nodes first
    await traverseDom<TextNode>(
        document,
        virtualDom,
        NodeFilter.SHOW_TEXT,
        (node: TextNode) => snapTextNode(node, l)
    );

    // Non-container element nodes
    await traverseDom<HTMLElement>(
        document,
        virtualDom,
        NodeFilter.SHOW_ELEMENT,
        (node: HTMLElement) => snapElementNode(node)
    );

    // Container element nodes
    await traverseDom<HTMLElementDepth>(
        document,
        virtualDom,
        NodeFilter.SHOW_ELEMENT,
        (node: HTMLElementDepth) => {
            if(!isElementType("container", node.tagName)) return;

            return snapElementContainerNode(node, k, domTreeHeight);
        }
    );

    // Attribute nodes
    await traverseDom<HTMLElement>(
        document,
        virtualDom,
        NodeFilter.SHOW_ELEMENT,
        (node: HTMLElement) => snapAttributeNode(node, m)   // work on parent element
    );

    const snapshot = virtualDom.innerHTML;
    let serializedHtml = optionsWithDefaults.debug
        ? formatHtml(snapshot)
        : snapshot;
        serializedHtml = serializedHtml
        .replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n")
        .replace(/\n *(\n|$)/g, "");
        serializedHtml = (k === Infinity && virtualDom.children.length)
        ? serializedHtml
            .trim()
            .replace(/^<[^>]+>\s*/, "")
            .replace(/\s*<\/[^<]+>$/, "")
        : serializedHtml;

    return {
        serializedHtml,
        meta: {
            originalSize,
            snapshotSize: snapshot.length,
            sizeRatio: snapshot.length / originalSize,
            estimatedTokens: Math.round(snapshot.length / 4)    // according to https://platform.openai.com/tokenizer
        }
    };
}