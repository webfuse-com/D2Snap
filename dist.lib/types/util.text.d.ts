import { type SentenceRankerFn } from "./types.js";
export declare function tokenizeSentences(text: string): string[];
export declare function transformWithRanking(text: string, ratio: number, rankSentencesFn: SentenceRankerFn, noEmpty?: boolean): string;
export declare function getByteLength(text: string): number;
export declare function getSizeRatio(snapshotSize: number, originalSize: number): number;
