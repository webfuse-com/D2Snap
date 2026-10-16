import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const HOTDOG_HTML = await readTestFile("hotdog/hotdog.options.minify");


await test("Take DOM snapshot (options.minify)", async () => {
    const snapshotTrue = await d2Snap(HOTDOG_HTML, 0.5, 0.5, 0.5, {
        debug: false,
        minify: true
    });

    await writeActual("hotdog/hotdog.options.minify.true", snapshotTrue.html);
    const expectedTrue = await readExpected("hotdog/hotdog.options.minify.true");

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

    const snapshotFalse = await d2Snap(HOTDOG_HTML, 0.5, 0.5, 0.5, {
        debug: false,
        minify: false
    });

    await writeActual("hotdog/hotdog.options.minify.false", snapshotFalse.html);
    const expectedFalse = await readExpected("hotdog/hotdog.options.minify.false");

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