import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


const HOTDOG_HTML = await readTestFile("hotdog/hotdog.options.filterEmptyElements");


await test("Take DOM snapshot (options.filterEmptyElements)", async () => {
    const snapshotFilter = await d2Snap(HOTDOG_HTML, 0, 1, 1, {
        debug: true,
        filterEmptyElements: true
    });

    await writeActual("hotdog/hotdog.options.filterEmptyElements", snapshotFilter.html);
    const expected = await readExpected("hotdog/hotdog.options.filterEmptyElements");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

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

    // No empty element filter (incl. empty image normalizer)
    const snapshotNoFilter = await d2Snap(HOTDOG_HTML, 0, 1, 1, {
        debug: true,
        filterEmptyElements: false,
        normalizers: defaults.NORMALIZERS
            .filter(normalizer => normalizer !== defaults.normalizers.filterEmptyImages)
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