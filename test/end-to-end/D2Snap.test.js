import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");
const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.no-text");


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
        0.47,
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

await test("Take DOM snapshot (S)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 1.0, 1.0, 1.0, {
        debug: true
    });

    await writeActual("pizza/pizza.s", snapshot.html);
    const expected = await readExpected("pizza/pizza.s");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.19,
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
        0.27,
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

await test("Take DOM snapshot (defaults)", async () => {
    const snapshotPizza = await d2Snap(PIZZA_HTML, 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("pizza/pizza.defaults", snapshotPizza.html);
    const expectedPizza = await readExpected("pizza/pizza.defaults");

    assertEqual(
        snapshotPizza.html,
        expectedPizza,
        "Invalid DOM snapshot (pizza)"
    );

    const snapshotHamburger = await d2Snap(HAMBURGER_HTML, 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("hamburger/hamburger.defaults", snapshotHamburger.html);
    const expectedHamburger = await readExpected("hamburger/hamburger.defaults");

    assertEqual(
        snapshotHamburger.html,
        expectedHamburger,
        "Invalid DOM snapshot (hamburger)"
    );
});

await test("Take DOM snapshot (empty)", async () => {
    const snapshot = await d2Snap("", 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("pizza.empty", snapshot.html);
    const expected = await readExpected("pizza/pizza.empty");

    assertEqual(
        snapshot.html,
        expected,
        "Invalid DOM snapshot"
    );
});

await test("DOM snapshot output type", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.6, 0.9);

    assertTrue(
        typeof(snapshot.dom) === "object",
        "Invalid DOM snapshot output type (dom)"
    );

    assertTrue(
        typeof(snapshot.html) === "string",
        "Invalid DOM snapshot output type (html)"
    );
});

await test("DOM snapshot HTML output scope", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.6, 0.9);

    assertNotIn(
        "<body",
        snapshot.innerHTML,
        "Invalid DOM snapshot HTML output scope (outerHTML; expects no BODY)"
    );

    assertEqual(
        snapshot.html,
        snapshot.innerHTML,
        "Invalid DOM snapshot HTML output scope (expects html === outerHTML; alias)"
    );

    assertIn(
        "<body",
        snapshot.outerHTML,
        "Invalid DOM snapshot HTML output scope (outerHTML; expects BODY)"
    );

    assertLess(
        snapshot.innerHTML.length,
        snapshot.outerHTML.length,
        "Invalid DOM snapshot HTML output scope lengths (expects |innerHTML| < |outerHTML|)"
    );
});