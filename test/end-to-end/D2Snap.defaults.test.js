import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.defaults");
const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.defaults");


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

    // All default features: normalizers, folding, attribute scores, text ranking, Markdown, empty elements, minification
    const snapshotHamburger = await d2Snap(HAMBURGER_HTML, 0.5, 0.5, 0.5);

    await writeActual("hamburger/hamburger.defaults", snapshotHamburger.html);
    const expectedHamburger = await readExpected("hamburger/hamburger.defaults");

    assertEqual(
        flattenDOMSnapshot(snapshotHamburger.html),
        flattenDOMSnapshot(expectedHamburger),
        "Invalid DOM snapshot (hamburger)"
    );
});