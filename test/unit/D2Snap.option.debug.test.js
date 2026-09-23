import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.debug)", async () => {
    const snapshotTrue = await d2Snap(PIZZA_HTML, 0.75, 0.75, 0.75, {
        debug: true
    });

    await writeActual("pizza/pizza.options.debug.true", snapshotTrue.html);
    const expectedTrue = await readExpected("pizza/pizza.options.debug.true");

    assertEqual(
        snapshotTrue.html,
        expectedTrue,
        "Invalid DOM snapshot (debug = true)"
    );

    assertIn(
        "\n",
        snapshotTrue.html,
        "Invalid DOM snapshot (debug = true)"
    );

    const snapshotFalse = await d2Snap(PIZZA_HTML, 0.75, 0.75, 0.75, {
        debug: false
    });

    await writeActual("pizza/pizza.options.debug.false", snapshotFalse.html);
    const expectedFalse = await readExpected("pizza/pizza.options.debug.false");

    assertEqual(
        snapshotFalse.html,
        expectedFalse,
        "Invalid DOM snapshot (debug = false)"
    );

    assertNotIn(
        "\n",
        snapshotFalse.html,
        "Invalid DOM snapshot (debug = false)"
    );
});