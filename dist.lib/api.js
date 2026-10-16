import { ensureDOM } from "./util.dom.js";
import { d2Snap as _d2Snap, normalizeDOM as _normalizeDOM } from "./D2Snap.js";
import { adaptiveD2Snap as _adaptiveD2Snap } from "./AdaptiveD2Snap.js";
async function d2Snap(domOrString, ...args) {
  return _d2Snap(await ensureDOM(domOrString), ...args);
}
async function normalizeDOM(domOrString, ...args) {
  return _normalizeDOM(await ensureDOM(domOrString), ...args);
}
async function adaptiveD2Snap(domOrString, ...args) {
  return _adaptiveD2Snap(await ensureDOM(domOrString), ...args);
}
import * as defaults from "./constants.defaults.js";
export {
  adaptiveD2Snap,
  d2Snap,
  defaults,
  normalizeDOM
};
