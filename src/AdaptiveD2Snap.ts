// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------

import { DOM, D2SnapOptions, Snapshot } from "./types.ts";
import { resolveRoot } from "./util.ts";
import { type d2Snap as D2SnapDOM } from "./D2Snap.dom.ts";
import { type d2Snap as D2SnapString } from "./D2Snap.string.ts";


export async function adaptiveD2Snap(
    d2SnapFn: typeof D2SnapDOM & typeof D2SnapString,
    dom: DOM | string,
    maxTokens: number = 4096,
    maxIterations: number = 5,
    options: D2SnapOptions = {}
): Promise<Snapshot & {
    parameters: {
        k: number; l: number; m: number;
        adaptiveIterations: number;
    }
}> {
    const S = (
        (typeof(dom) !== "string")
            ? resolveRoot(dom).outerHTML
            : dom
    ).length;
    const M = 1e6;

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
                halton(i, 7),
                halton(i, 3),
                halton(i, 3)
            ];
        }
    }


    let i = 0;
    let sCalc = S;
    let parameters, snapshot;
    const haltonGenerator = generateHalton();
    while(true) {
        const haltonPoint: number[] = haltonGenerator.next().value!;

        const computeParam = (haltonValue: number) => Math.min((sCalc / M) * haltonValue, 1);

        parameters = {
            k: computeParam(haltonPoint[0]),
            l: computeParam(haltonPoint[1]),
            m: computeParam(haltonPoint[2])
        };
        snapshot = await d2SnapFn.call(null, dom, parameters.k, parameters.l, parameters.m, options);
        sCalc = sCalc**1.125;   // stretch

        if(snapshot.meta.estimatedTokens <= maxTokens)
            break;

        if(i++ === maxIterations)
            throw new RangeError("Unable to create snapshot below given token threshold");
    }

    return {
        ...snapshot,

        parameters: {
            ...parameters,

            adaptiveIterations: i
        }
    };
}