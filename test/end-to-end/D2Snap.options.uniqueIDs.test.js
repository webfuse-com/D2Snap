import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.uniqueIDs");


await test("Take DOM snapshot (options.uniqueIDs)", async () => {
    const dom = new JSDOM(HAMBURGER_HTML).window;
    const domRoot = dom.document.body;

    const snapshotFalse = await d2Snap(domRoot, 0.75, 0.75, 0.75, {
        debug: true,
        uniqueIDs: false
    });

    await writeActual("hamburger/hamburger.options.uniqueIDs.false", snapshotFalse.html);
    const expectedFalse = await readExpected("hamburger/hamburger.options.uniqueIDs.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (uniqueIDs = false)"
    );

    assertNotIn(
        " data-uid=",
        domRoot.outerHTML,
        "Invalid DOM snapshot (uniqueIDs = false)"
    );

    const snapshotTrue = await d2Snap(domRoot, 0.75, 0.75, 0.75, {
        debug: true,
        uniqueIDs: true
    });

    await writeActual("hamburger/hamburger.options.uniqueIDs.true", snapshotTrue.html);
    const expectedTrue = await readExpected("hamburger/hamburger.options.uniqueIDs.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expectedTrue),
        "Invalid DOM snapshot (uniqueIDs = true)"
    );

    assertIn(
        " data-uid=",
        domRoot.outerHTML,
        "Invalid DOM snapshot (uniqueIDs = true)"
    );

    // Stable across snapshots (existing IDs reused)
    const snapshotTrueAgain = await d2Snap(domRoot, 0.75, 0.75, 0.75, {
        debug: true,
        uniqueIDs: true
    });

    assertEqual(
        snapshotTrueAgain.html,
        snapshotTrue.html,
        "Invalid DOM snapshot (uniqueIDs = true; stable across snapshots)"
    );
});