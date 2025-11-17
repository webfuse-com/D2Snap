import { D2SnapOptions, Snapshot } from "./types.ts";
import { formatHtml } from "./util.ts";
import { getAttributeSemantics, getContainerSemantics, isElementType } from "./ground-truth.ts";
import { relativeTextRank } from "./TextRank.ts";
import { KEEP_LINE_BREAK_MARK, turndown } from "./Turndown.ts";
import { NodeType, AttributeNode, ElementNode, HTMLParserTransformer } from "./HTMLParserTransformer.ts";
import * as d2SnapUtil from "./D2Snap.util.ts";


const FILTER_CONTENT_TAG_NAMES = [
    "TH", "TR", "TD", "THEAD", "TBODY", "LI"
];


function estimateDOMTreeHeight(html: string): number {
    const tagRegex = /<\/?([a-zA-Z0-9\-]+)(\s[^>]*)?>/g;

    let currentDepth = 0;
    let maxDepth = 0;

    while(true) {
        let match: RegExpExecArray | null = tagRegex.exec(html);
        if(!match) break;

        const tag = match[0];

        if (tag.startsWith("<!") || tag.startsWith("<?") || tag.startsWith("<!--")) continue;

        const isClosingTag = tag.startsWith("</");
        const isSelfClosingTag = tag.endsWith("/>") ||
        /<\s*(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)\b/i.test(tag);
        if(isClosingTag || isSelfClosingTag) {
            currentDepth = Math.max(0, currentDepth - 1);

            continue;
        }

        maxDepth = Math.max(++currentDepth , maxDepth);
    }

    return maxDepth;
}

export async function mergeElementNode(
    element: ElementNode,
    mergeUpwardsCb: (tagName: string, childTagName: string) => boolean,
    levels: number = Infinity
): Promise<void> {
    const removeDuplicateAttributes = (attrs: AttributeNode[]): AttributeNode[] => {
        const result: AttributeNode[] = [];

        const seen: Set<string> = new Set();
        for(const attr of attrs) {
            if(seen.has(attr.name)) continue;

            result.push(attr);
            seen.add(attr.name);
        }

        return result;
    };

    const mergeAttributes = (target: ElementNode, source: ElementNode) => {
        target.attributes = removeDuplicateAttributes([...target.attributes, ...source.attributes]);
    };

    let hasChanged: boolean = true;
    while(hasChanged) {
        hasChanged = false;

        for(let i: number = 0; i < element.children.length; i++) {
            const child = element.children[i];

            if(child.type !== NodeType.ELEMENT || !isElementType("container", child.tagName)) continue;
            if((child.depth - element.depth) >= levels) continue;

            hasChanged = true;

            const mergeUpwards: boolean = mergeUpwardsCb(element.tagName, child.tagName);

            if(mergeUpwards) {
                mergeAttributes(element, child);

                element.children.splice(i, 1, ...child.children);

                for(const independentChild of child.children) {
                    if(independentChild.type !== NodeType.ELEMENT) continue;

                    independentChild.parentElement = element;
                }

                i = -1;

                continue;
            }

            mergeAttributes(child, element);

            element.children.splice(i, 1, ...child.children);
            element.tagName = child.tagName;
            element.attributes = child.attributes;

            for(const independentChild of element.children) {
                if(independentChild.type !== NodeType.ELEMENT) continue;

                element.parentElement = element;
            }

            i = -1;
        }
    }
}

function dissolveParentHTMLTag(html: string): string {
    const match = html
        .trim()
        .match(/^<([a-zA-Z0-9-]+)(\s[^>]*)?>([\s\S]*)<\/\1>$/i);

    return match
        ? match[3].trim()
        : html;
}


const OMITTED_OPTION_KEYS = "assignUniqueIDs";

export async function d2Snap(
    dom: string,
    k: number, l: number, m: number,
    options: Omit<D2SnapOptions, typeof OMITTED_OPTION_KEYS> = {}
): Promise<Snapshot> {
    dom = dom.trim().replace(/^<!DOCTYPE +[a-z]+ *>\s*/i, "");

    d2SnapUtil.validateParams(k, l, m);

    const optionsWithDefaults = d2SnapUtil.getOptionsWithDefaults<typeof OMITTED_OPTION_KEYS>(options);

    const domTreeHeight = estimateDOMTreeHeight(dom);
    const mergeLevels: number = Math.max(Math.round(domTreeHeight * (Math.min(1, k))), 1);

    const parserTransformer = new HTMLParserTransformer({
        onText(text) {
            text.textContent = relativeTextRank(text.textContent, (1 - l), undefined, true);

            return text;
        },
        onElement(element: ElementNode) {
            for(let i = 0; i < element.attributes.length; i++) {
                if(getAttributeSemantics(element.attributes[i].name) >= m) continue;

                element.attributes.splice(i, 1);
                i--;
            }

            if(isElementType("interactive", element.tagName)) return element;

            if(isElementType("content", element.tagName)) {
                if(FILTER_CONTENT_TAG_NAMES.includes(element.tagName.toUpperCase())) return element;
                if(optionsWithDefaults.skipMarkdownTranslation) return element;

                return turndown(HTMLParserTransformer.outerHTML([ element ]));
            }

            if(isElementType("container", element.tagName)) {
                if(element.depth % mergeLevels > 0) return element;

                mergeElementNode(element, (elementTagName: string, childTagName: string) => {
                    return getContainerSemantics(elementTagName)
                        >= getContainerSemantics(childTagName);
                }, mergeLevels);

                return element;
            }

            if(optionsWithDefaults.keepUnknownElements) return element;

            return null;
        }
    });

    let snapshot = (await parserTransformer.parse(dom))
        .html
        .replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n");

    if(k === Infinity) {
        snapshot = dissolveParentHTMLTag(snapshot);
    }

    return {
        serializedHtml: optionsWithDefaults.debug
            ? formatHtml(snapshot)
            : snapshot,
        meta: {
            originalSize: dom.length,
            snapshotSize: snapshot.length,
            sizeRatio: snapshot.length / dom.length,
            estimatedTokens: Math.round(snapshot.length / 4)
        }
    };
}