import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const FRIES_HTML = await readTestFile("fries/fries.options.markdown");


await test("Take DOM snapshot (options.markdown)", async () => {
    const snapshotTrue = await d2Snap(FRIES_HTML, 0.7, 0.8, 1, {
        debug: true,
        markdown: true
    });

    await writeActual("fries/fries.options.markdown.true", snapshotTrue.html);
    const expectedTrue = await readExpected("fries/fries.options.markdown.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expectedTrue),
        "Invalid DOM snapshot (markdown = true)"
    );

    const snapshotFalse = await d2Snap(FRIES_HTML, 0.7, 0.8, 1, {
        debug: true,
        markdown: false
    });

    await writeActual("fries/fries.options.markdown.false", snapshotFalse.html);
    const expectedFalse = await readExpected("fries/fries.options.markdown.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (markdown = false)"
    );
});