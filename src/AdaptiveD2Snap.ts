// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------

import { type DOM, type D2SnapOptions, type D2SnapResult } from "./types.js";
import { d2Snap } from "./D2Snap.js";


export interface AdaptiveParameters {
    rE: number;
    rA: number;
    rT: number;
}


function* generateHalton() {
	const halton = (index: number, base: number) => {
		let result: number = 0;
		let f: number = 1 / base;
		let i: number = index;

		while(i > 0) {
			result += f * (i % base);
			i = Math.floor(i / base);
			f /= base;
		}

		return result;
	};

	let i = 0;
	while(true) {
		i++;

		yield [
			halton(i, 2),
			halton(i, 3),
			halton(i, 5)
		];
	}
}


export function adaptiveD2Snap(
	d2SnapFn: typeof d2Snap,
	dom: DOM,
	maxTokens: number = 2**15,	// 32768
	maxIterations: number = 5,
	options: Partial<D2SnapOptions> = {}
): D2SnapResult & {
    parameters: AdaptiveParameters;
    adaptiveIterations: number;
} {
	const haltonGenerator = generateHalton();
	const parameters: AdaptiveParameters = {
		rE: 0, rA: 0, rT: 0
	};

	let aggressiveness: number = 0;  // grows from 0 toward 1 across iterations
	let snapshot: D2SnapResult | undefined;

	for(let i = 0; i <= maxIterations; i++) {
		const haltonPoint: number[] = haltonGenerator.next().value!;

		const jitter = (h: number) => 0.5 + 0.5 * h;

		parameters.rE = Math.min(aggressiveness * jitter(haltonPoint[0]), 1);
		parameters.rA = Math.min(aggressiveness * jitter(haltonPoint[1]), 1);
		parameters.rT = Math.min(aggressiveness * jitter(haltonPoint[2]), 1);

		snapshot = d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);

		if(snapshot.meta.tokenEstimate <= maxTokens) {
			return {
				...snapshot,
				parameters,
				adaptiveIterations: i
			};
		}

		const overshoot: number = snapshot.meta.tokenEstimate / maxTokens; // > 1 means over budget

		if(i === 0) {
			aggressiveness = Math.min(0.9, 1 - 1 / overshoot);

			continue;
		}

		const logOver: number = Math.log2(overshoot);
		const step: number = Math.max(0.05, 0.15 * logOver);

		aggressiveness = Math.min(1, aggressiveness + step);
	}

	throw new RangeError(
		`Unable to create snapshot below ${maxTokens} tokens (last estimate: ${snapshot?.meta.tokenEstimate})`
	);
}