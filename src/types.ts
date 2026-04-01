export enum NodeFilter {
    SHOW_ALL = 4294967295,
    SHOW_ELEMENT = 1,
    SHOW_ATTRIBUTE = 2,
    SHOW_COMMENT = 128,
    SHOW_TEXT = 4
};

export enum Node {
    ELEMENT_NODE = 1,
    ATTRIBUTE_NODE = 2,
    TEXT_NODE = 3
}

export type TextNode = Node & {
    nodeType: number;
    textContent: string;

    innerText?: string;
};

export type HTMLElementWithDepth = HTMLElement & {
    depth: number;
};

export type DOM = Document | Element;

export type TextRankOptions = {
    damping: number;
    maxIterations: number;
    maxSentences: number;
}

export type D2SnapOptions = {
    debug?: boolean;
    groundTruth?: GroundTruthJSON;
    skipMarkdown?: boolean;
    textRankOptions?: Partial<TextRankOptions>;
    uniqueIDs?: boolean;
};

export type D2SnapResult = {
    meta: {
        estimatedTokens: number;
        originalSize: number;
        sizeRatio: number;
        snapshotSize: number;
    }
    html: string;
};

export type GroundTruthJSON = {
    typeElement: {
        container: {
            tagNames: string[];
            ratings: Record<string, number>;
            fallbackRating: number;
        };
        actionable: {
            tagNames: string[];
        };
        textFormatting: {
            tagNames: string[];
        };
    }
    typeAttribute: {
        ratings: Record<string, number>;
        fallbackRating: number;
    };
};