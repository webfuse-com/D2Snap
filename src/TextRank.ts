// ------------------------------------------
// Copyright (c) Rada Mihalcea and Paul Tarau
// ------------------------------------------


import { type TextRankOptions } from "./types.js";


type Vector = number[];
type Matrix = number[][];

interface TextRankSentence {
	index: number;
	sentence: string;
	score: number;
}


function initArray(n: number, value: number = 0): number[] {
	return Array.from({ length: n }, () => value);
}

function initMatrix(n: number, m: number = n): number[][] {
	return initArray(n)
        .map(() => initArray(m));
}

export function tokenizeSentences(text: string): string[] {
	return text
		.split(/(?<=\p{Sentence_Terminal})\s|\n|\r/gu)
        .map((rawSentence: string) => rawSentence.trim())
        .filter((sentence: string) => !!sentence);
}


export function textRank(sentences: string[], options: Partial<TextRankOptions> = {}): TextRankSentence[] {
	if(!sentences.length) return [];

	const optionsWithDefaults: TextRankOptions = {
		damping: 0.75,
		maxIterations: 20,

		...options
	};

	const sentenceTokens: string[][] = sentences
        .map((sentence: string) => sentence
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(token => !!token.trim()));
	const n: number = sentences.length;

	const similarityMatrix: Matrix = initMatrix(n);
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			if (i === j) continue;

			const vector1: Vector = [];
			const vector2: Vector = [];
			for(const token of new Set(sentenceTokens[i].concat(sentenceTokens[j]))) {
				vector1.push(sentenceTokens[i].filter(w => w === token).length);
				vector2.push(sentenceTokens[j].filter(w => w === token).length);
			}

			let dotProduct: number = 0;
			let normA: number = 0;
			let normB: number = 0;
			for(let i = 0; i < vector1.length; i++) {
				dotProduct += vector1[i] * vector2[i];
				normA += vector1[i] * vector1[i];
				normB += vector2[i] * vector2[i];
			}
			similarityMatrix[i][j] = dotProduct / (normA**0.5 * normB**0.5 + 1e-10);
		}
	}

	const scores: Vector = initArray(n, 1);
	for(let iteration = 0; iteration < optionsWithDefaults.maxIterations; iteration++) {
		for(let i = 0; i < n; i++) {
			let sum: number = 0;
			for(let j = 0; j < n; j++) {
				if (i === j) continue;

				let norm: number = 0;
				for(let i = 0; i < similarityMatrix[j].length; i++) {
					norm += similarityMatrix[j][i] * similarityMatrix[i][i];
				}
				sum += (similarityMatrix[j][i] / (norm || 1)) * scores[j];
			}

			scores[i] = optionsWithDefaults.damping * sum + (1 - optionsWithDefaults.damping);
		}
	}

	return sentences
        .map((sentence: string, i: number) => {
        	return {
        		sentence,
        		index: i,
        		score: scores[i]
        	};
        })
        .sort((a, b) => b.score - a.score);
}

export function transform(
	text: string,
	ratio: number = 0.5,
	simple: boolean = false,
	noEmpty: boolean = false,
	textRankOptions: Partial<TextRankOptions> = {}
): string {
	const sentences: string[] = tokenizeSentences(text);
	const k: number = Math.min(
		Math.max(
			Math.round(sentences.length * ratio),
			+noEmpty
		),
		sentences.length
	);

	if(sentences.length <= k) return sentences.join("\n");
	
	if(simple) {
		return sentences
			.slice(0, k)
			.join("\n");
	}

	return textRank(sentences, textRankOptions)
        .slice(0, k)
        .sort((a, b) => a.index - b.index)
        .map(obj => obj.sentence)
        .join("\n");
}