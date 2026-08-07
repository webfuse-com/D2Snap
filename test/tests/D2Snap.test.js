import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (L)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.3, 0.3, {
        debug: true
    });

    await writeActual("pizza/pizza.l", snapshot.html);
    const expected = await readExpected("pizza/pizza.l");

    assertAlmostEqual(
        snapshot.meta.originalSize,
        2780,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.49,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (M)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.4, 0.8, 0.6, {
        debug: true
    });

    await writeActual("pizza/pizza.m", snapshot.html);
    const expected = await readExpected("pizza/pizza.m");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.35,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (S)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1.0, 1.0, 1.0, {
        debug: true
    });

    await writeActual("pizza/pizza.s", snapshot.html);
    const expected = await readExpected("pizza/pizza.s");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.28,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (linearized)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1, 1, 0, {
        debug: true
    });

    await writeActual("pizza/pizza.lin", snapshot.html);
    const expected = await readExpected("pizza/pizza.lin");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.36,
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