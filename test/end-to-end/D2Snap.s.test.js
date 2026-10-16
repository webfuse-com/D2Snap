import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.s");


await test("Take DOM snapshot (S)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.8, 1.0, 1.0, {
        debug: true
    });

    await writeActual("pizza/pizza.s", snapshot.html);
    const expected = await readExpected("pizza/pizza.s");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.27,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertLess(
        snapshot.meta.sizeRatio,
        0.39,
        "Invalid DOM snapshot size ratio (expects smaller than M)"
    );

    assertTrue(
        !!snapshot.dom.querySelector(":scope > * > *"),
        "Invalid DOM snapshot hierarchy (expects nested elements, unlike linearized)"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});