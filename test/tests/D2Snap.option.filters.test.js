import { readTestFile, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.filterDataURLs)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0.5, 1, 1, {
        filterDataURLs: true,
        debug: false
    });

    assertNotIn(
        "data:image/png;base64,",
        snapshotFilter.html,
        "Invalid DOM snapshot"
    );
    const snapshotNoFilter = await d2Snap(PIZZA_HTML, 0.5, 1, 1, {
        filterDataURLs: false,
        debug: false
    });

    assertIn(
        "data:image/png;base64,",
        snapshotNoFilter.html,
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.filterEmptyElements)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0, 1, 1, {
        filterEmptyElements: true,
        debug: false
    });

    assertNotIn(
        "<div></div>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "<br>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    assertIn(
        "<input>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    const snapshotNoFilter = await d2Snap(PIZZA_HTML, 0, 1, 1, {
        filterEmptyElements: false,
        debug: false
    });

    assertIn(
        "<div></div>",
        flattenDOMSnapshot(snapshotNoFilter.html),
        "Invalid DOM snapshot"
    );

    assertIn(
        "<br>",
        flattenDOMSnapshot(snapshotNoFilter.html),
        "Invalid DOM snapshot"
    );

    assertIn(
        "<input>",
        flattenDOMSnapshot(snapshotNoFilter.html),
        "Invalid DOM snapshot"
    );
});