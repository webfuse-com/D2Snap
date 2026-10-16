import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.normalizers.filterNoiseElements");


const _swapNormalizer = (defaultNormalizer, customNormalizer) => {
    return defaults.NORMALIZERS
        .map(normalizer => (normalizer === defaultNormalizer) ? customNormalizer : normalizer);
};


await test("Take DOM snapshot (options.normalizers; filterNoiseElements)", async () => {
    const snapshotFilter = await d2Snap(HAMBURGER_HTML, 0, 1, 1, {
        debug: true,
        normalizers: _swapNormalizer(
            defaults.normalizers.filterNoiseElements,
            (virtualNode, liveNode, context) => defaults.normalizers.filterNoiseElements(virtualNode, liveNode, context, {
                tagNames: [ "li", "SMALL", "StYlE", "BUTTON" ]
            })
        )
    });

    await writeActual("hamburger/hamburger.options.normalizers.filterNoiseElements", snapshotFilter.html);
    const expected = await readExpected("hamburger/hamburger.options.normalizers.filterNoiseElements");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "<li>",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop LI)"
    );

    assertNotIn(
        "<small",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop SMALL)"
    );

    assertNotIn(
        "<style",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop STYLE)"
    );

    // Can override actionables
    assertNotIn(
        "<button",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop BUTTON)"
    );
});