import { type SentenceRankerFn } from "./types.js";


const SENTENCE_DELIMITER_REGEX: RegExp = /(?<=\p{Sentence_Terminal})\s|\n|\r/gu;


export function tokenizeSentences(text: string): string[] {
	return text
		.split(SENTENCE_DELIMITER_REGEX)
        .map((rawSentence: string) => rawSentence.trim())
        .filter((sentence: string) => !!sentence);
}

// Keep the share of highest-ranked sentences (any ranker), in original order.
export function transformWithRanking(
	text: string,
	ratio: number,
	rankSentencesFn: SentenceRankerFn,
	noEmpty: boolean = false	// TODO: Add to D2Snap API?
): string {
	const sentences: string[] = tokenizeSentences(text);
	const k: number = Math.min(
		Math.max(
			Math.ceil(sentences.length * ratio),
			+noEmpty
		),
		sentences.length
	);

	if(sentences.length <= k) return sentences.join("\n");

	const keptSentenceCounts: Map<string, number> = new Map<string, number>();

	for(const sentence of rankSentencesFn([ ...sentences ]).slice(0, k)) {
		keptSentenceCounts.set(sentence, (keptSentenceCounts.get(sentence) ?? 0) + 1);
	}

	return sentences
		.filter((sentence: string) => {
			const keptSentenceCount: number = keptSentenceCounts.get(sentence) ?? 0;

			if(!keptSentenceCount) return false;

			keptSentenceCounts.set(sentence, keptSentenceCount - 1);

			return true;
		})
		.join("\n");
}

const TEXT_ENCODER: TextEncoder = new TextEncoder();

// UTF-8 byte length (string length counts UTF-16 code units).
export function getByteLength(text: string): number {
	return TEXT_ENCODER.encode(text).length;
}

// Size ratio of a snapshot (empty from empty is unchanged: 1).
export function getSizeRatio(snapshotSize: number, originalSize: number): number {
	if(originalSize === 0) return (snapshotSize === 0) ? 1 : Infinity;

	return snapshotSize / originalSize;
}