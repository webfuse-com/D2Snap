import { readTestFile } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.defaults");


// Argument resolution is covered by unit tests; this checks the public API passes all forms through.

await test("Take DOM snapshot (ratios object)", async () => {
    assertEqual(
        (await d2Snap(PIZZA_HTML, { r: 0.5, rT: 0.2 }, { debug: true })).html,
        (await d2Snap(PIZZA_HTML, 0.5, 0.5, 0.2, { debug: true })).html,
        "Invalid DOM snapshot (ratios object equals specific ratios; options passed)"
    );
});

await test("Fail taking DOM snapshot (invalid ratios object)", async () => {
    let snapshotErr;
    try {
        await d2Snap(PIZZA_HTML, { rA: 2 });
    } catch(err) {
        snapshotErr = err;
    }

    assertTrue(
        (snapshotErr instanceof RangeError) && snapshotErr.message.startsWith("Parameter rA "),
        `Invalid error (ratios object; rA out of range): ${snapshotErr?.message ?? "(no error)"}`
    );
});