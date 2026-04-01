// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------


import { DOM } from "./types.js";
import { ensureDOM } from "./util.dom.js";
import { d2Snap as _d2Snap} from "./D2Snap.js";
import { adaptiveD2Snap  as _adaptiveD2Snap} from "./AdaptiveD2Snap.js";


export async function d2Snap(
    domOrString: DOM | string,
    ...args: Parameters<typeof _d2Snap> extends [ unknown, ...infer T ] ? T : never
) {
    return _d2Snap(await ensureDOM(domOrString), ...args);
}

export async function adaptiveD2Snap(
    domOrString: DOM | string,
    ...args: Parameters<typeof _adaptiveD2Snap> extends [ unknown, unknown, ...infer T ] ? T : never
) {
    return _adaptiveD2Snap(d2Snap, await ensureDOM(domOrString), ...args);
}