import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.l");


await test("Take DOM snapshot (L)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.3, 0.3, {
        debug: true
    });

    await writeActual("pizza/pizza.l", snapshot.html);
    const expected = await readExpected("pizza/pizza.l");

    assertAlmostEqual(
        snapshot.meta.originalSize,
        2370,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.53,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});