// ------------------------------------------
// Copyright (c) Rada Mihalcea and Paul Tarau
// ------------------------------------------


import { type TextRankOptions } from "./types.js";


interface TextRankSentence {
	index: number;
	sentence: string;
	score: number;
}


function initArray<T>(n: number): (T | null)[] {
	return Array.from({ length: n }, () => null);
}


export function tokenizeSentences(text: string): string[] {
	return text
		.split(/(?<=\p{Sentence_Terminal})\s|\n|\r/gu)
        .map((rawSentence: string) => rawSentence.trim())
        .filter((sentence: string) => !!sentence);
}


export function textRank(sentences: string[], options: Partial<TextRankOptions> = {}): TextRankSentence[] {
	if (!sentences.length) return [];

	const optionsWithDefaults: TextRankOptions = {
		damping: 0.75,
		maxIterations: 20,
		minSimilarity: 0.1,
		tolerance: 1e-4,
		...options
	};

	const sentenceCount: number = sentences.length;

	const termFrequencyPerSentence = initArray<Map<string, number>>(sentenceCount);
	const sentenceVectorNorms: Float64Array = new Float64Array(sentenceCount);
	const tokenPattern: RegExp = /[a-z0-9]+/g;

	for(let i = 0; i < sentenceCount; i++) {
		const termFrequencies: Map<string, number> = new Map<string, number>();
		const lowercaseSentence: string = sentences[i].toLowerCase();

		let tokenMatch: RegExpExecArray | null;
		while((tokenMatch = tokenPattern.exec(lowercaseSentence)) !== null) {
			const token: string = tokenMatch[0];
			const previousCount: number = termFrequencies.get(token) ?? 0;
			termFrequencies.set(token, previousCount + 1);
		}

		termFrequencyPerSentence[i] = termFrequencies;

		let sumOfSquaredCounts: number = 0;
		for(const count of termFrequencies.values()) {
			sumOfSquaredCounts += count * count;
		}

		sentenceVectorNorms[i] = Math.sqrt(sumOfSquaredCounts);
	}

	const tokenPostings: Map<string, number[]> = new Map<string, number[]>();

	for(let i = 0; i < sentenceCount; i++) {
		for(const token of termFrequencyPerSentence[i]!.keys()) {
			let postingList: number[] | undefined = tokenPostings.get(token);

			if(!postingList) {
				postingList = [];

				tokenPostings.set(token, postingList);
			}

			postingList.push(i);
		}
	}

	const neighborIndicesPerSentence = initArray<number[]>(sentenceCount);
	const neighborWeightsPerSentence = initArray<Float64Array>(sentenceCount);
	const weightedOutDegree: Float64Array = new Float64Array(sentenceCount);
	const dotProductAccumulator: Float64Array = new Float64Array(sentenceCount);
	const touchedNeighbors: number[] = [];

	for(let i = 0; i < sentenceCount; i++) {
		const sourceNorm: number = sentenceVectorNorms[i];

		if(sourceNorm === 0) {
			neighborIndicesPerSentence[i] = [];
			neighborWeightsPerSentence[i] = new Float64Array(0);

			continue;
		}

		const sourceTermFrequencies: Map<string, number> = termFrequencyPerSentence[i]!;

		for(const [token, sourceCount] of sourceTermFrequencies) {
			const postingList: number[] = tokenPostings.get(token)!;

			for(let j = 0; j < postingList.length; j++) {
				const targetIndex: number = postingList[j];
				if(targetIndex === i) continue;

				if(dotProductAccumulator[targetIndex] === 0) {
					touchedNeighbors.push(targetIndex);
				}

				const targetCount: number = termFrequencyPerSentence[targetIndex]!.get(token)!;

				dotProductAccumulator[targetIndex] += sourceCount * targetCount;
			}
		}

		const neighborIndices: number[] = [];
		const neighborWeights: number[] = [];

		let outDegreeSum: number = 0;

		for(let k = 0; k < touchedNeighbors.length; k++) {
			const targetIndex: number = touchedNeighbors[k];
			const dotProduct: number = dotProductAccumulator[targetIndex];
			const targetNorm: number = sentenceVectorNorms[targetIndex];

			if(dotProduct > 0 && targetNorm > 0) {
				const cosineSimilarity: number = dotProduct / (sourceNorm * targetNorm);
				if (cosineSimilarity > optionsWithDefaults.minSimilarity) {
					neighborIndices.push(targetIndex);
					neighborWeights.push(cosineSimilarity);
					outDegreeSum += cosineSimilarity;
				}
			}

			dotProductAccumulator[targetIndex] = 0;
		}

		touchedNeighbors.length = 0;

		neighborIndicesPerSentence[i] = neighborIndices;
		neighborWeightsPerSentence[i] = Float64Array.from(neighborWeights);
		weightedOutDegree[i] = outDegreeSum;
	}

	let currentScores: Float64Array = new Float64Array(sentenceCount).fill(1);
	let nextScores: Float64Array = new Float64Array(sentenceCount);

	const damping: number = optionsWithDefaults.damping;
	const teleportTerm: number = 1 - damping;
	const tolerance: number = optionsWithDefaults.tolerance;
	const maxIterations: number = optionsWithDefaults.maxIterations;

	for(let i = 0; i < maxIterations; i++) {
		let totalAbsoluteDelta: number = 0;

		for(let j = 0; j < sentenceCount; j++) {
			const neighborIndices: number[] = neighborIndicesPerSentence[j]!;
			const neighborWeights: Float64Array = neighborWeightsPerSentence[j]!;
			let weightedScoreSum: number = 0;

			for (let k = 0; k < neighborIndices.length; k++) {
				const neighborIndex: number = neighborIndices[k];
				const neighborOutDegree: number = weightedOutDegree[neighborIndex];
				if (neighborOutDegree > 0) {
					weightedScoreSum += (neighborWeights[k] / neighborOutDegree) * currentScores[neighborIndex];
				}
			}

			const updatedScore: number = teleportTerm + damping * weightedScoreSum;
			const scoreDifference: number = updatedScore - currentScores[j];

			nextScores[j] = updatedScore;
			totalAbsoluteDelta += scoreDifference < 0 ? -scoreDifference : scoreDifference;
		}

		const swapBuffer: Float64Array = currentScores;

		currentScores = nextScores;
		nextScores = swapBuffer;

		if(totalAbsoluteDelta < (tolerance * sentenceCount)) break;
	}

	return sentences
		.map((sentence, i) => ({
			sentence,
			index: i,
			score: currentScores[i]
		}))
		.sort((a: TextRankSentence, b: TextRankSentence) => b.score - a.score);
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