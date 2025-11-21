import { TextRankOptions } from "./TextRank.ts";


export enum NodeFilter {
    SHOW_ALL = 4294967295,
    SHOW_ATTRIBUTE = 2,
    SHOW_COMMENT = 128,
    SHOW_ELEMENT = 1,
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

export type HTMLElementDepth = HTMLElement & {
    depth: number;
};

export type DOM = Document | HTMLElement;

export type D2SnapOptions = {
    assignUniqueIDs?: boolean;
    debug?: boolean;
    keepUnknownElements?: boolean;
    skipMarkdownTranslation?: boolean;
    textRankOptions?: Partial<TextRankOptions>;
};

export type Snapshot = {
    meta: {
        estimatedTokens: number;
        originalSize: number;
        sizeRatio: number;
        snapshotSize: number;
    }
    serializedHtml: string;
};