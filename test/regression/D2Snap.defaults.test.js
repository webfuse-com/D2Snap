import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (defaults)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("pizza/pizza.defaults", snapshot.html);
    const expected = await readExpected("pizza/pizza.defaults");

    assertEqual(
        snapshot.html,
        expected,
        "Invalid DOM snapshot"
    );
});