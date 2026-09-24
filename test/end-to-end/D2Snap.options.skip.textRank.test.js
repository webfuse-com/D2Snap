import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.skip.textRank)", async () => {
    const snapshotTrue = await d2Snap(PIZZA_HTML, 1, 1, 0.5, {
        debug: true,
        skip: {
            textRank: true
        }
    });

    await writeActual("pizza/pizza.options.skip.textRank.true", snapshotTrue.html);
    const expected = await readExpected("pizza/pizza.options.skip.textRank.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot (skip.textRank = true)"
    );

    const snapshotFalse = await d2Snap(PIZZA_HTML, 1, 1, 0.5, {
        debug: true,
        skip: {
            textRank: false
        }
    });

    await writeActual("pizza/pizza.options.skip.textRank.false", snapshotFalse.html);
    const expectedFalse = await readExpected("pizza/pizza.options.skip.textRank.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (skip.textRank = false)"
    );
});