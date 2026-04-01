// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------

import { DOM, D2SnapOptions, D2SnapResult } from "./types.js";
import { resolveRoot } from "./util.dom.js";
import { d2Snap } from "./D2Snap.js";


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


export async function adaptiveD2Snap(
    d2SnapFn: typeof d2Snap,
    dom: DOM,
    maxTokens: number = 4096,
    maxIterations: number = 5,
    options: D2SnapOptions = {}
): Promise<D2SnapResult & {
    parameters: {
        rE: number; rA: number; rT: number;
        adaptiveIterations: number;
    }
}> {
    const S = (
        (typeof(dom) !== "string")
            ? resolveRoot(dom).outerHTML
            : dom
    ).length;
    const M = 1e6;

    let i = 0;
    let sCalc = S;
    let parameters, snapshot;
    const haltonGenerator = generateHalton();
    while(true) {
        const haltonPoint: number[] = haltonGenerator.next().value!;

        const computeParam = (haltonValue: number) => Math.min((sCalc / M) * haltonValue, 1);

        parameters = {
            rE: computeParam(haltonPoint[0]),
            rA: computeParam(haltonPoint[1]),
            rT: computeParam(haltonPoint[2])
        };
        snapshot = await d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);
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