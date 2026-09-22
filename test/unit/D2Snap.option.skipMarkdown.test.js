import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


await test("Take DOM snapshot (options.skipMarkdown)", async () => {
    const snapshot = await d2Snap(await readTestFile("pizza/pizza"), 0.7, 0.8, 1, {
        debug: true,
        skipMarkdown: true
    });

    await writeActual("pizza/pizza.options.skip-markdown", snapshot.html);
    const expected = await readExpected("pizza/pizza.options.skip-markdown");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});