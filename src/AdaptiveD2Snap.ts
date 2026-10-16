// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------

import {
	type DeepPartial,
	type DOM,
	type D2SnapOptions,
	type D2SnapResult
} from "./types.js";
import { resolveRoot, serializeSnapshotRoot } from "./util.dom.js";
import { searchITP } from "./util.search.js";
import { getByteLength, getSizeRatio } from "./util.text.js";
import { d2Snap as _d2Snap, normalizeDOM as _normalizeDOM } from "./D2Snap.js";


export interface AdaptiveParameters {
    rE: number;
    rA: number;
    rT: number;
}

export type AdaptiveD2SnapResult = D2SnapResult & {
    parameters: AdaptiveParameters;
    adaptiveIterations: number;
};

export type AdaptiveD2SnapError = RangeError & {
    meta: {
        lastEstimate: number;
    };
};


// Snapshots within this share below the token limit end the search.
const TOKEN_TOLERANCE: number = 0.05;
// Resolution of the ratio search (snapshots change in discrete steps).
const RATIO_RESOLUTION: number = 1e-3;
// ITP truncation scale (tuned to the near-linear token curves).
const ITP_K1: number = 0.05;
// On a plateau (unchanged tokens at a bracket end), snapshots this close to the token limit end the search.
const PLATEAU_TOKEN_SHARE: number = 0.85;


function throwTokenLimitError(maxTokens: number, tokenEstimate: number): never {
	const err = new RangeError(
		`Unable to create snapshot below ${maxTokens} tokens (last estimate: ${tokenEstimate})`
	) as AdaptiveD2SnapError;

	err.meta = {
		lastEstimate: tokenEstimate
	};

	throw err;
}


// Search along r = rE = rA = rT: r = 0 and r = 1 bracket the token limit, ITP narrows the bracket.
export function adaptiveD2Snap(
	dom: DOM,
	maxTokens: number = 2**15,	// 32768
	maxIterations: number = 5,
	options: DeepPartial<D2SnapOptions> = {}
): AdaptiveD2SnapResult {
	const originalSize: number = getByteLength(serializeSnapshotRoot(resolveRoot(dom)));

	// Pre-process once (according to the options)
	const normalizedDOM: Element = _normalizeDOM(dom, options).dom;
	const snapshotOptions: DeepPartial<D2SnapOptions> = {
		...options,

		normalizers: [],
		shadowDOM: false,
		uniqueIDs: false
	};

	let snapshotCount: number = 0;
	let closestSnapshot: D2SnapResult | null = null;
	let closestRatio: number = 0;
	// Bracket end tokens (above and within the limit), and whether the last snapshot left them unchanged
	let aboveTokenEstimate: number = -1;
	let withinTokenEstimate: number = -1;
	let isPlateau: boolean = false;

	const snap = (r: number) => {
		const snapshot: D2SnapResult = _d2Snap(normalizedDOM, r, r, r, snapshotOptions);
		const tokenEstimate: number = snapshot.meta.tokenEstimate;

		snapshotCount++;

		isPlateau = (tokenEstimate === aboveTokenEstimate || tokenEstimate === withinTokenEstimate);

		if(tokenEstimate > maxTokens) {
			aboveTokenEstimate = tokenEstimate;
		} else {
			withinTokenEstimate = tokenEstimate;
		}

		if(tokenEstimate <= maxTokens && tokenEstimate > (closestSnapshot?.meta.tokenEstimate ?? -1)) {
			closestSnapshot = snapshot;
			closestRatio = r;
		}

		return tokenEstimate;
	};
	const isCloseTo = (share: number) => {
		return closestSnapshot!.meta.tokenEstimate >= maxTokens * share;
	};

	// Unreduced snapshot within the limit: closest possible
	const unreducedTokenEstimate: number = snap(0);

	if(!closestSnapshot) {
		if(maxIterations < 1) throwTokenLimitError(maxTokens, unreducedTokenEstimate);

		// Most reduced snapshot beyond the limit: none within it
		const reducedTokenEstimate: number = snap(1);

		if(!closestSnapshot) throwTokenLimitError(maxTokens, reducedTokenEstimate);

		searchITP(
			(r: number) => snap(r) - maxTokens,
			{
				a: 0,
				fa: unreducedTokenEstimate - maxTokens,
				b: 1,
				fb: reducedTokenEstimate - maxTokens
			},
			{
				epsilon: RATIO_RESOLUTION / 2,
				maxEvaluations: maxIterations - 1,
				k1: ITP_K1,
				stop: () => isCloseTo(1 - TOKEN_TOLERANCE) || (isPlateau && isCloseTo(PLATEAU_TOKEN_SHARE))
			}
		);
	}

	const result: AdaptiveD2SnapResult = closestSnapshot;

	result.parameters = {
		rE: closestRatio,
		rA: closestRatio,
		rT: closestRatio
	};
	result.adaptiveIterations = snapshotCount - 1;

	// Sizes refer to the input DOM (not the normalized one)
	result.meta.originalSize = originalSize;
	Object.defineProperty(result.meta, "sizeRatio", {
		get: () => getSizeRatio(result.meta.snapshotSize, originalSize),
		enumerable: true
	});

	return result;
}