import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.skipTextRank)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1, 1, 1, {
        debug: true,
        skipTextRank: true
    });

    await writeActual("pizza/pizza.options.skip-textrank", snapshot.html);
    const expected = await readExpected("pizza/pizza.options.skip-textrank");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot (without TextRank)"
    );

    const snapshotNoSkip = await d2Snap(PIZZA_HTML, 1, 1, 1, {
        debug: true,
        skipTextRank: false
    });

    await writeActual("pizza/pizza.options.textrank", snapshotNoSkip.html);
    const expectedNoSkip = await readExpected("pizza/pizza.options.textrank");

    assertEqual(
        flattenDOMSnapshot(snapshotNoSkip.html),
        flattenDOMSnapshot(expectedNoSkip),
        "Invalid DOM snapshot (with TextRank)"
    );
});