import { TextRankOptions } from "./types.js";
export declare function tokenizeSentences(text: string): string[];
export declare function textRank(textOrSentences: string | string[], k?: number, options?: Partial<TextRankOptions>): string;
export declare function relativeTextRank(text: string, ratio?: number, options?: Partial<TextRankOptions>, noEmpty?: boolean): string;
