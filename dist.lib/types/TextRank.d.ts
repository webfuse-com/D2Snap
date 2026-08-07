import { type TextRankOptions } from "./types.js";
interface TextRankSentence {
    index: number;
    score: number;
    sentence: string;
}
export declare function tokenizeSentences(text: string): string[];
export declare function textRank(sentences: string[], options?: Partial<TextRankOptions>): TextRankSentence[];
export declare function transform(text: string, ratio?: number, simple?: boolean, noEmpty?: boolean, textRankOptions?: Partial<TextRankOptions>): string;
export {};
