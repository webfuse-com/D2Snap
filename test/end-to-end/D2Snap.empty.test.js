import { writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


await test("Take DOM snapshot (empty)", async () => {
    const snapshot = await d2Snap("", 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("pizza/pizza.empty", snapshot.html);
    const expected = await readExpected("pizza/pizza.empty");

    assertEqual(
        snapshot.html,
        expected,
        "Invalid DOM snapshot"
    );

    // Empty to empty: unchanged (numeric ratio)
    for(const input of [ "", "   ", "<!-- comment -->" ]) {
        const { meta } = await d2Snap(input, 0.5, 0.5, 0.5);

        assertEqual(
            [ meta.originalSize, meta.snapshotSize, meta.sizeRatio ],
            [ 0, 0, 1 ],
            `Invalid size metadata (empty input ${JSON.stringify(input)})`
        );
    }
});