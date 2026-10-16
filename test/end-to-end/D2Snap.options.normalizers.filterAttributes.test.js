import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.normalizers.filterAttributes");


const _swapNormalizer = (defaultNormalizer, customNormalizer) => {
    return defaults.NORMALIZERS
        .map(normalizer => (normalizer === defaultNormalizer) ? customNormalizer : normalizer);
};


await test("Take DOM snapshot (options.normalizers; filterAttributes)", async () => {
    const snapshotFilter = await d2Snap(HAMBURGER_HTML, 0.9, 0, 1, {
        debug: true,
        normalizers: _swapNormalizer(
            defaults.normalizers.filterAttributes,
            (virtualNode, liveNode, context) => defaults.normalizers.filterAttributes(virtualNode, liveNode, context, {
                attributeNames: [ "class", "TABINDEX", "aria-LABEL" ]
            })
        )
    });

    await writeActual("hamburger/hamburger.options.normalizers.filterAttributes", snapshotFilter.html);
    const expected = await readExpected("hamburger/hamburger.options.normalizers.filterAttributes");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "class=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'class')"
    );

    assertNotIn(
        "tabindex=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'tabindex')"
    );

    assertNotIn(
        "aria-label=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'aria-label')"
    );
});