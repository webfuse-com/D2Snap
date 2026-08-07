import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.debug)", async () => {
    const snapshotNoDebug = await d2Snap(PIZZA_HTML, 0.75, 0.75, 0.75, {
        debug: false
    });

    await writeActual("pizza/pizza.options.debug", snapshotNoDebug.html);
    const expected = await readExpected("pizza/pizza.options.debug");

    assertEqual(
        snapshotNoDebug.html,
        expected,
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "\n",
        snapshotNoDebug.html,
        "Invalid DOM snapshot (no debug)"
    );

    const snapshotDebug = await d2Snap(PIZZA_HTML, 0.75, 0.75, 0.75, {
        debug: true
    });

    assertIn(
        "\n",
        snapshotDebug.html,
        "Invalid DOM snapshot (debug)"
    );
});