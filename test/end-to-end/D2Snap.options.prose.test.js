import { readTestFile } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const FRIES_HTML = await readTestFile("fries/fries.options.sentenceRanker");


const countActionables = dom => dom.querySelectorAll("a, button, input, select, textarea").length;
const textLength = dom => dom.textContent.replace(/\s+/g, " ").trim().length;

await test("Take DOM snapshot (options.prose)", async () => {
    // Default: per text node (paper)
    assertEqual(
        (await d2Snap(FRIES_HTML, 0.5, 0.5, 1, { debug: true, prose: false })).html,
        (await d2Snap(FRIES_HTML, 0.5, 0.5, 1, { debug: true })).html,
        "Invalid DOM snapshot (prose is opt-in)"
    );

    const snapshot = await d2Snap(FRIES_HTML, 0, 0, 1, { prose: true });
    const defaultSnapshot = await d2Snap(FRIES_HTML, 0, 0, 1);
    const fullSnapshot = await d2Snap(FRIES_HTML, 0, 0, 0, { prose: true });

    assertEqual(
        countActionables(snapshot.dom),
        countActionables(fullSnapshot.dom),
        "Invalid DOM snapshot (prose; actionables always survive)"
    );
    assertTrue(
        textLength(snapshot.dom) <= textLength(defaultSnapshot.dom),
        "Invalid DOM snapshot (prose; text not shorter than per text node)"
    );
    assertEqual(
        (await d2Snap(FRIES_HTML, 0, 0, 0, { prose: true, debug: true })).html,
        (await d2Snap(FRIES_HTML, 0, 0, 0, { prose: true, debug: true, sentenceRanker: null })).html,
        "Invalid DOM snapshot (prose; rT = 0 leaves text untouched)"
    );
});