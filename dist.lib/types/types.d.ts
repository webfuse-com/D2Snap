export declare enum NodeFilter {
    SHOW_ALL = 4294967295,
    SHOW_ELEMENT = 1,
    SHOW_ATTRIBUTE = 2,
    SHOW_COMMENT = 128,
    SHOW_TEXT = 4
}
export declare enum NodeType {
    ELEMENT_NODE = 1,
    ATTRIBUTE_NODE = 2,
    TEXT_NODE = 3,
    COMMENT_NODE = 8
}
export type TextNode = Node & {
    nodeType: number;
    textContent: string;
    innerText?: string;
};
export type DOM = Document | Element;
export interface HTMLElementWithDepth extends HTMLElement {
    depth: number;
}
export interface AttributeScoring {
    [name: string]: number;
}
export interface TextRankOptions {
    damping: number;
    maxIterations: number;
    minSimilarity: number;
    tolerance: number;
}
export interface D2SnapOptions {
    attributeScores: AttributeScoring;
    attributeScoring?: AttributeScoring;
    classification: {
        actionableElements: string[];
        textElements: string[];
        textLabelAttributes: string[];
    };
    debug: boolean;
    filter: {
        attributes: string[];
        dataURLs: boolean;
        elements: string[];
        emptyElements: boolean;
    };
    normalize: {
        iconfontsFromNames: string[];
        labelsFromAttributes: string[];
        svgToImg: boolean;
    };
    skip: {
        markdown: boolean;
        textRank: boolean;
    };
    minify: boolean;
    uniqueIDs: boolean;
    textRankOptions?: TextRankOptions;
}
export interface D2SnapResult {
    dom: DOM;
    innerHTML: string;
    html: string;
    outerHTML: string;
    meta: {
        tokenEstimate: number;
        originalSize: number;
        sizeRatio: number;
        snapshotSize: number;
        /** Per-pass wall-clock timings in ms. Only present when `debug: true`. */
        timings?: {
            [key: string]: number;
        };
    };
}
