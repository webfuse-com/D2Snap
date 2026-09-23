import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.minify)", async () => {
    const snapshotTrue = await d2Snap(PIZZA_HTML, 0.5, 0.5, 0.5, {
        debug: false,
        minify: true
    });

    await writeActual("pizza/pizza.options.minify.true", snapshotTrue.html);
    const expectedTrue = await readExpected("pizza/pizza.options.minify.true");

    assertEqual(
        snapshotTrue.html,
        expectedTrue,
        "Invalid DOM snapshot (minify = true)"
    );

    assertNotIn(
        "\n",
        snapshotTrue.html,
        "Invalid DOM snapshot (minify = true)"
    );

    const snapshotFalse = await d2Snap(PIZZA_HTML, 0.5, 0.5, 0.5, {
        debug: false,
        minify: false
    });

    await writeActual("pizza/pizza.options.minify.false", snapshotFalse.html);
    const expectedFalse = await readExpected("pizza/pizza.options.minify.false");

    assertEqual(
        snapshotFalse.html,
        expectedFalse,
        "Invalid DOM snapshot (minify = false)"
    );

    assertIn(
        "\n",
        snapshotFalse.html,
        "Invalid DOM snapshot (minify = false)"
    );
});