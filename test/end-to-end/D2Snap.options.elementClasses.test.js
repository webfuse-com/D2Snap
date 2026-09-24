import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.elementClasses)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.7, 1, 1, {
        debug: true,
        elementClasses: {
            actionables: [ "li", "STRONG" ],
            text: [ "p", "B" ]
        }
    });

    await writeActual("pizza/pizza.options.elementClasses", snapshot.html);
    const expected = await readExpected("pizza/pizza.options.elementClasses");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});