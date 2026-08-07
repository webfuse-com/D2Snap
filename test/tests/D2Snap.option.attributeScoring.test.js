import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.attributeScoring)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.9, 0.5, 0.1, {
        debug: true,
        attributeScoring: {
            class: 0,

        },
        attributeScoringFallback: 1
    });

    await writeActual("pizza/pizza.attribute-scoring", snapshot.html);
    const expected = await readExpected("pizza/pizza.attribute-scoring");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    const snapshotAttributeWildcard = await d2Snap(PIZZA_HTML, 0, 0.9, 1, {
        debug: true,
        attributeScoring: {
            "aria-*": 1.0,
            "data-*": 1.0
        }
    });

    await writeActual("pizza/pizza.attribute-scoring.wildcard", snapshotAttributeWildcard.html);
    const expectedARIA = await readExpected("pizza/pizza.attribute-scoring.wildcard");

    assertEqual(
        flattenDOMSnapshot(snapshotAttributeWildcard.html),
        flattenDOMSnapshot(expectedARIA),
        "Invalid DOM snapshot (attribute wildcard suffix '{aria-|data-}*')"
    );
});