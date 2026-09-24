import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.outerHTML)", async () => {
    const snapshotTrue = await d2Snap(PIZZA_HTML, 0.9, 0.6, 1, {
        debug: true,
        outerHTML: true
    });

    await writeActual("pizza/pizza.options.outerHTML.true", snapshotTrue.html);
    const expectedTrue = await readExpected("pizza/pizza.options.outerHTML.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expectedTrue),
        "Invalid DOM snapshot (outerHTML = true)"
    );

    assertIn(
        "<body",
        snapshotTrue.html,
        "Invalid DOM snapshot (outerHTML = true)"
    );

    const snapshotFalse = await d2Snap(PIZZA_HTML, 0.9, 0.6, 1, {
        debug: true,
        outerHTML: false
    });

    await writeActual("pizza/pizza.options.outerHTML.false", snapshotFalse.html);
    const expectedFalse = await readExpected("pizza/pizza.options.outerHTML.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (outerHTML = false)"
    );

    assertNotIn(
        "<body",
        snapshotFalse.html,
        "Invalid DOM snapshot (outerHTML = false)"
    );
});