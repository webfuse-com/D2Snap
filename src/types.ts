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
    TEXT_NODE = 3,
    COMMENT_NODE = 8
}

export type TextNode = Node & {
    nodeType: number;
    textContent: string;

    innerText?: string;
};

export type DOM = Document | Element;

export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | JSONObject;

export interface JSONObject {
	[ key: string ]: JSONValue;
}

export interface HTMLElementWithDepth extends HTMLElement {
    depth: number;
};

export interface TextRankOptions {
    damping: number;
    maxIterations: number;
}

export interface D2SnapOptions {
    debug: boolean;
    groundTruth: Partial<GroundTruthJSON>;
    groundTruthReplaceDefault: boolean;
    filterDataURLs: boolean;
    filteredTagNames: string[];
    skipMarkdown: boolean;
    skipTextRank: boolean;
    textRankOptions: Partial<TextRankOptions>;
    uniqueIDs: boolean;
};

export interface D2SnapResult {
    meta: {
        tokenEstimate: number;
        originalSize: number;
        sizeRatio: number;
        snapshotSize: number;
    }
    html: string;
};

export interface GroundTruthJSON extends JSONObject {
    typeElement: {
        container: {
            tagNames: string[];
            ratings: {
                [ key: string ]: number;
            };
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