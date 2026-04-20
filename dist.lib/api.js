import { ensureDOM } from "./util.dom.js";
import { d2Snap as _d2Snap } from "./D2Snap.js";
import { adaptiveD2Snap as _adaptiveD2Snap } from "./AdaptiveD2Snap.js";
async function d2Snap(domOrString, ...args) {
  return _d2Snap(await ensureDOM(domOrString), ...args);
}
async function adaptiveD2Snap(domOrString, ...args) {
  return _adaptiveD2Snap(d2Snap, await ensureDOM(domOrString), ...args);
}
export {
  adaptiveD2Snap,
  d2Snap
};
