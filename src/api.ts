// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------


import {
	type DeepPartial,
	type DOM,
	type D2SnapArgs,
	type D2SnapOptions,
	type D2SnapRatios,
	type D2SnapResult
} from "./types.js";
import { ensureDOM } from "./util.dom.js";
import { d2Snap as _d2Snap, normalizeDOM as _normalizeDOM } from "./D2Snap.js";
import { adaptiveD2Snap as _adaptiveD2Snap } from "./AdaptiveD2Snap.js";


export function d2Snap(domOrString: DOM | string, rE: number, rA: number, rT: number, options?: DeepPartial<D2SnapOptions>): Promise<D2SnapResult>;
export function d2Snap(domOrString: DOM | string, ratios: D2SnapRatios, options?: DeepPartial<D2SnapOptions>): Promise<D2SnapResult>;
export function d2Snap(domOrString: DOM | string, ...args: D2SnapArgs): Promise<D2SnapResult>;	// all forms (e.g., passed through by wrappers)
export async function d2Snap(domOrString: DOM | string, ...args: D2SnapArgs): Promise<D2SnapResult> {
	return _d2Snap(await ensureDOM(domOrString), ...args);
}

export async function normalizeDOM(
	domOrString: DOM | string,
	...args: Parameters<typeof _normalizeDOM> extends [ unknown, ...infer T ] ? T : never
) {
	return _normalizeDOM(await ensureDOM(domOrString), ...args);
}

export async function adaptiveD2Snap(
	domOrString: DOM | string,
	...args: Parameters<typeof _adaptiveD2Snap> extends [ unknown, ...infer T ] ? T : never
) {
	return _adaptiveD2Snap(await ensureDOM(domOrString), ...args);
}


export type {
	D2SnapOptions,
	D2SnapResult,
	NormalizeDOMOptions,
	NormalizeDOMResult,
	NodeNormalizerFn,
	NormalizerContext,
	ElementClassifierFn,
	SentenceRankerFn,
	AttributeScoring,
	D2SnapRatios,
	D2SnapArgs
} from "./types.js";
export type { AdaptiveD2SnapResult, AdaptiveD2SnapError } from "./AdaptiveD2Snap.js";

export * as defaults from "./constants.defaults.js";


// TODO: Class interface?