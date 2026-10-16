import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const FRIES_HTML = await readTestFile("fries/fries.options.sentenceRanker.null");


await test("Take DOM snapshot (options.sentenceRanker = null)", async () => {
    // No ranking: leading sentences are kept
    const snapshotNull = await d2Snap(FRIES_HTML, 1, 1, 0.5, {
        debug: true,
        sentenceRanker: null
    });

    await writeActual("fries/fries.options.sentenceRanker.null.null", snapshotNull.html);
    const expectedNull = await readExpected("fries/fries.options.sentenceRanker.null.null");

    assertEqual(
        flattenDOMSnapshot(snapshotNull.html),
        flattenDOMSnapshot(expectedNull),
        "Invalid DOM snapshot (sentenceRanker = null)"
    );

    // Default ranker (TextRank)
    const snapshotDefault = await d2Snap(FRIES_HTML, 1, 1, 0.5, {
        debug: true
    });

    await writeActual("fries/fries.options.sentenceRanker.null.default", snapshotDefault.html);
    const expectedDefault = await readExpected("fries/fries.options.sentenceRanker.null.default");

    assertEqual(
        flattenDOMSnapshot(snapshotDefault.html),
        flattenDOMSnapshot(expectedDefault),
        "Invalid DOM snapshot (default sentence ranker)"
    );
});