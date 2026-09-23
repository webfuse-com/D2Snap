import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.skip.textRank)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1, 1, 0.5, {
        debug: true,
        skip: {
            textRank: true
        }
    });

    await writeActual("pizza/pizza.options.skip.textRank", snapshot.html);
    const expected = await readExpected("pizza/pizza.options.skip.textRank");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot (without TextRank)"
    );

    const snapshotSkipFalse = await d2Snap(PIZZA_HTML, 1, 1, 0.5, {
        debug: true,
        skip: {
            textRank: false
        }
    });

    await writeActual("pizza/pizza.options.skip.textRank.false", snapshotSkipFalse.html);
    const expectedSkipFalse = await readExpected("pizza/pizza.options.skip.textRank.false");

    assertEqual(
        flattenDOMSnapshot(snapshotSkipFalse.html),
        flattenDOMSnapshot(expectedSkipFalse),
        "Invalid DOM snapshot (with TextRank)"
    );
});