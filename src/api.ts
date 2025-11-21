// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------


import { DOM } from "./D2Snap.types.ts";
import { d2Snap as _d2SnapDOM} from "./D2Snap.dom.ts";
import { d2Snap as _d2SnapString} from "./D2Snap.string.ts";
import { adaptiveD2Snap  as _adaptiveD2Snap} from "./AdaptiveD2Snap.ts";


function isDOMString(domOrString: DOM | string): boolean {
    return typeof(domOrString) === "string";
}


// TODO: Force hydration argument? 
export async function d2Snap(
    domOrString: DOM | string,
    ...args: Parameters<typeof _d2SnapDOM> extends [ unknown, ...infer T ] ? T : never
) {
    return isDOMString(domOrString)
        ? _d2SnapString(domOrString as string, ...args)
        : _d2SnapDOM(domOrString as DOM, ...args);
}

export async function adaptiveD2Snap(
    domOrString: DOM | string,
    ...args: Parameters<typeof _adaptiveD2Snap> extends [ unknown, unknown, ...infer T ] ? T : never
) {
    return _adaptiveD2Snap(d2Snap, domOrString, ...args);
}