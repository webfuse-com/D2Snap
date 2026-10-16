import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.lin");


await test("Take DOM snapshot (linearized)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1, 1, 0, {
        debug: true
    });

    await writeActual("pizza/pizza.lin", snapshot.html);
    const expected = await readExpected("pizza/pizza.lin");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.32,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "one**##",
        snapshot.html,
        "Invalid collapsed whitespace in DOM snapshot (1)"
    );

    assertNotIn(
        "MargheritaA",
        snapshot.html,
        "Invalid collapsed whitespace in DOM snapshot (2)"
    );
});