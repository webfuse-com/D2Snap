import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.uniqueIDs)", async () => {
    const dom = new JSDOM(PIZZA_HTML).window;
    const domRoot = dom.document.body;

    const snapshotFalse = await d2Snap(PIZZA_HTML, 0.75, 0.75, 0.75, {
        debug: true,
        uniqueIDs: false
    });

    await writeActual("pizza/pizza.options.uniqueIDs.false", snapshotFalse.html);
    const expectedFalse = await readExpected("pizza/pizza.options.uniqueIDs.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (uniqueIDs = false)"
    );

    assertNotIn(
        " data-uid=",
        domRoot.outerHTML,
        "Invalid DOM snapshot (uniqueIDs = false)"
    );

    const snapshotTrue = await d2Snap(domRoot, 0.75, 0.75, 0.75, {
        debug: true,
        uniqueIDs: true
    });

    await writeActual("pizza/pizza.options.uniqueIDs.true", snapshotTrue.html);
    const expectedTrue = await readExpected("pizza/pizza.options.uniqueIDs.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expectedTrue),
        "Invalid DOM snapshot (uniqueIDs = true)"
    );

    assertIn(
        " data-uid=",
        domRoot.outerHTML,
        "Invalid DOM snapshot (uniqueIDs = true)"
    );
});