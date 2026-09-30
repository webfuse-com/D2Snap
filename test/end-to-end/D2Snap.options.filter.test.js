import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.filter.dataURLs)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0.5, 0, 1, {
        debug: true,
        filter: {
            dataURLs: true
        },
        skip: {
            markdown: true
        }
    });

    await writeActual("pizza/pizza.options.filter.dataURLs", snapshotFilter.html);
    const expectedFalse = await readExpected("pizza/pizza.options.filter.dataURLs");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "data:image/png;base64,",
        snapshotFilter.html,
        "Invalid DOM snapshot"
    );

    const snapshotNoFilter = await d2Snap(PIZZA_HTML, 0.5, 0, 1, {
        debug: true,
        filter: {
            dataURLs: false
        },
        skip: {
            markdown: true
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
        debug: true,
        filter: {
            emptyElements: true
        }
    });

    await writeActual("pizza/pizza.options.filter.emptyElements", snapshotFilter.html);
    const expectedFalse = await readExpected("pizza/pizza.options.filter.emptyElements");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expectedFalse),
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

    const snapshotNoFilter = await d2Snap(PIZZA_HTML, 0, 1, 1, {
        debug: true,
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

await test("Take DOM snapshot (options.filter.attributes)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0.9, 0, 1, {
        debug: true,
        filter: {
            attributes: [ "class", "TABINDEX", "aria-LABEL" ]
        }
    });

    await writeActual("pizza/pizza.options.filter.attributes", snapshotFilter.html);
    const expectedFalse = await readExpected("pizza/pizza.options.filter.attributes");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "class=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'class')"
    );

    assertNotIn(
        "tabindex=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'tabindex')"
    );

    assertNotIn(
        "aria-label=\"",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop 'aria-label')"
    );
});

await test("Take DOM snapshot (options.filter.elements)", async () => {
    const snapshotFilter = await d2Snap(PIZZA_HTML, 0, 1, 1, {
        debug: true,
        filter: {
            elements: [ "li", "SMALL", "StYlE", "BUTTON" ]
        }
    });

    await writeActual("pizza/pizza.options.filter.elements", snapshotFilter.html);
    const expectedFalse = await readExpected("pizza/pizza.options.filter.elements");

    assertEqual(
        flattenDOMSnapshot(snapshotFilter.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "<li>",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop LI)"
    );

    assertNotIn(
        "<small",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop SMALL)"
    );

    assertNotIn(
        "<style",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop STYLE)"
    );

    // Can override actionables
    assertNotIn(
        "<button",
        snapshotFilter.html,
        "Invalid DOM snapshot (drop BUTTON)"
    );
});