import { resolveRoot, serializeSnapshotRoot } from "./util.dom.js";
import { searchITP } from "./util.search.js";
import { getByteLength, getSizeRatio } from "./util.text.js";
import { d2Snap as _d2Snap, normalizeDOM as _normalizeDOM } from "./D2Snap.js";
const TOKEN_TOLERANCE = 0.05;
const RATIO_RESOLUTION = 1e-3;
const ITP_K1 = 0.05;
const PLATEAU_TOKEN_SHARE = 0.85;
function throwTokenLimitError(maxTokens, tokenEstimate) {
  const err = new RangeError(
    `Unable to create snapshot below ${maxTokens} tokens (last estimate: ${tokenEstimate})`
  );
  err.meta = {
    lastEstimate: tokenEstimate
  };
  throw err;
}
function adaptiveD2Snap(dom, maxTokens = 2 ** 15, maxIterations = 5, options = {}) {
  const originalSize = getByteLength(serializeSnapshotRoot(resolveRoot(dom)));
  const normalizedDOM = _normalizeDOM(dom, options).dom;
  const snapshotOptions = {
    ...options,
    normalizers: [],
    shadowDOM: false,
    uniqueIDs: false
  };
  let snapshotCount = 0;
  let closestSnapshot = null;
  let closestRatio = 0;
  let aboveTokenEstimate = -1;
  let withinTokenEstimate = -1;
  let isPlateau = false;
  const snap = (r) => {
    const snapshot = _d2Snap(normalizedDOM, r, r, r, snapshotOptions);
    const tokenEstimate = snapshot.meta.tokenEstimate;
    snapshotCount++;
    isPlateau = tokenEstimate === aboveTokenEstimate || tokenEstimate === withinTokenEstimate;
    if (tokenEstimate > maxTokens) {
      aboveTokenEstimate = tokenEstimate;
    } else {
      withinTokenEstimate = tokenEstimate;
    }
    if (tokenEstimate <= maxTokens && tokenEstimate > (closestSnapshot?.meta.tokenEstimate ?? -1)) {
      closestSnapshot = snapshot;
      closestRatio = r;
    }
    return tokenEstimate;
  };
  const isCloseTo = (share) => {
    return closestSnapshot.meta.tokenEstimate >= maxTokens * share;
  };
  const unreducedTokenEstimate = snap(0);
  if (!closestSnapshot) {
    if (maxIterations < 1) throwTokenLimitError(maxTokens, unreducedTokenEstimate);
    const reducedTokenEstimate = snap(1);
    if (!closestSnapshot) throwTokenLimitError(maxTokens, reducedTokenEstimate);
    searchITP(
      (r) => snap(r) - maxTokens,
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
        stop: () => isCloseTo(1 - TOKEN_TOLERANCE) || isPlateau && isCloseTo(PLATEAU_TOKEN_SHARE)
      }
    );
  }
  const result = closestSnapshot;
  result.parameters = {
    rE: closestRatio,
    rA: closestRatio,
    rT: closestRatio
  };
  result.adaptiveIterations = snapshotCount - 1;
  result.meta.originalSize = originalSize;
  Object.defineProperty(result.meta, "sizeRatio", {
    get: () => getSizeRatio(result.meta.snapshotSize, originalSize),
    enumerable: true
  });
  return result;
}
export {
  adaptiveD2Snap
};
