import { readTestFile, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


// TODO: tagNames

await test("Take DOM snapshot (options.filter.dataURLs)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0.5, 1, 1, {
        debug: false,
        filter: {
            dataURLs: true
        },
		labelToText: {
            tagNames: []
        }
    });

    assertNotIn(
        "data:image/png;base64,",
        snapshotFilter.html,
        "Invalid DOM snapshot"
    );
    const snapshotNoFilter = await d2Snap(PIZZA_HTML, 0.5, 1, 1, {
        debug: false,
        filter: {
            dataURLs: false
        },
		labelToText: {
            tagNames: []
        }
    });

    assertIn(
        "data:image/png;base64,",
        snapshotNoFilter.html,
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.filter.emptyElements)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0, 1, 1, {
        debug: false,
        filter: {
            emptyElements: true
        }
    });

    assertNotIn(
        "<div></div>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    assertIn(
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
        debug: false,
        filter:
        {
            emptyElements: false
        }
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