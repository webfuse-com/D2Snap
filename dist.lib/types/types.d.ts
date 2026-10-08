export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type TextNode = Node & {
    nodeType: number;
    textContent: string;
    innerText?: string;
};
export type DOM = Document | Element;
export interface ElementWithDepth extends HTMLElement {
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
    };
    debug: boolean;
    filter: {
        attributes: string[];
        dataURLs: boolean;
        elements: string[];
        emptyElements: boolean;
    };
    normalize: {
        iconClasses: string[];
        labelAttributes: string[];
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
            [step: string]: number;
        };
    };
}
