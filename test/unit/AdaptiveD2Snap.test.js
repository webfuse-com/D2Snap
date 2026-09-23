import { readTestFile, writeActual, flattenDOMSnapshot } from "../test.util.js";

import { adaptiveD2Snap } from "../../dist.lib/api.js";



const WEBFUSE_HTML = await readTestFile("webfuse/webfuse");


await test("Validate raw DOM snapshot (>= 25K tokens)", async () => {
    assertMore(
        WEBFUSE_HTML.length / 4,
        25000,
        "Invalid raw DOM snapshot size (< 25K tokens)"
    );
});


await test("Take adaptive DOM snapshot (max 5K tokens)", async () => {
    const snapshot = await adaptiveD2Snap(WEBFUSE_HTML, 5000, 5, {
        debug: true,
        attributeScoring: {
            class: 0
        },
        uniqueIDs: true
    });

    await writeActual("webfuse/webfuse.5K", snapshot.html);

    assertLess(
        snapshot.meta.tokenEstimate,
        5000,
        "Invalid adaptive DOM snapshot size (max 5K)"
    );
    assertMore(
        snapshot.meta.tokenEstimate,
        1500,
        "Invalid adaptive DOM snapshot size (min 1.5K; close-to-cap paradigm)"
    );

    assertIn(
        flattenDOMSnapshot("<a href=\"/about\" data-uid=\"597\">About us</a>"),
        flattenDOMSnapshot(snapshot.html),
        "Interactive element not preserved"
    );
});

await test("Fail taking adaptive DOM snapshot (max 1K tokens)", async () => {
    let snapshotErr;
    try {
        await adaptiveD2Snap(WEBFUSE_HTML, 1000, 1, {
            debug: true
        });
    } catch(err) {
        snapshotErr = err;
    }

    assertThrows(
        () => {
            if(snapshotErr) throw snapshotErr;
        },
        "AdaptiveD2Snap did not throw despite too low token threshold (max 1K)"
    );
});