export enum NodeFilter {
    SHOW_ALL = 4294967295,
    SHOW_ELEMENT = 1,
    SHOW_ATTRIBUTE = 2,
    SHOW_COMMENT = 128,
    SHOW_TEXT = 4
};

export enum NodeType {
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
};

export interface AttributeScoring {
    [ name: string ]: number;
}

export interface TextRankOptions {
    damping: number;
    maxIterations: number;
    minSimilarity: number;
    tolerance: number;
}

export interface D2SnapOptions {
    attributeScores: AttributeScoring;
    attributeScoring?: AttributeScoring;    // deprecated (alias)
    debug: boolean;
    elementClasses: Partial<{
        actionables: string[];
        text: string[];
    }> | undefined;
    filter: Partial<{
        dataURLs: boolean;
        emptyElements: boolean;
        tagNames: string[];
    }> | undefined;
    labelToText: Partial<{
        iconFonts: boolean;
        tagNames: string[];
    }> | undefined;
    minify: boolean;
    skip: Partial<{
        markdown: boolean;
        textRank: boolean;
    }> | undefined;
    textRankOptions: Partial<TextRankOptions> | undefined;
    uniqueIDs: boolean;
};

export interface D2SnapResult {
    dom: DOM,
    innerHTML: string; html: string;
    outerHTML: string;
    meta: {
        tokenEstimate: number;
        originalSize: number;
        sizeRatio: number;
        snapshotSize: number;
        /** Per-pass wall-clock timings in ms. Only present when `debug: true`. */
        timings?: { [ key: string ]: number; };
    }
};