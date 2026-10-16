import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const FRIES_HTML = await readTestFile("fries/fries.options.sentenceRanker");

// Ranks later sentences higher
const reverseSentenceRanker = sentences => [ ...sentences ].reverse();


await test("Take DOM snapshot (options.sentenceRanker)", async () => {
    const snapshot = await d2Snap(FRIES_HTML, 1, 1, 0.5, {
        debug: true,
        sentenceRanker: reverseSentenceRanker
    });

    await writeActual("fries/fries.options.sentenceRanker", snapshot.html);
    const expected = await readExpected("fries/fries.options.sentenceRanker");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    assertIn(
        "They taste best fresh and still hot from the fryer.",
        snapshot.html,
        "Invalid DOM snapshot (sentence ranker; keeps highest-ranked sentence)"
    );

    assertNotIn(
        "Fries are thin strips of deep-fried potato.",
        snapshot.html,
        "Invalid DOM snapshot (sentence ranker; drops lowest-ranked sentence)"
    );

    // No sentence ranker: leading sentences are kept
    const snapshotNoRanker = await d2Snap(FRIES_HTML, 1, 1, 0.5, {
        debug: true,
        sentenceRanker: null
    });

    assertIn(
        "Fries are thin strips of deep-fried potato.",
        snapshotNoRanker.html,
        "Invalid DOM snapshot (no sentence ranker; keeps leading sentence)"
    );
});