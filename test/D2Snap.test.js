import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

import { d2Snap, adaptiveD2Snap } from "../dist.lib/api.js";


function path(fileName) {
    return join(import.meta.dirname, `./files/${fileName}.html`);
}

function readFile(fileName) {
    return readFileSync(path(fileName)).toString();
}

function readExpected(domName) {
    return readFile(`${domName}.expected`);
}

function writeActual(domName, html) {
    return writeFileSync(path(`${domName}.actual`), html ?? "");
}

function flattenDOMSnapshot(snapshot) {
    return snapshot
        .trim()
        .replace(/\s*[\n\r]+\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/>\s+</g, "><")
        .replace(/>\s+/g, ">")
        .replace(/\s+</g, "<");
}


await test("Take adaptive DOM snapshot (4096)", async () => {
    const snapshot = await adaptiveD2Snap(await readFile("agents"), 4096, 5, {
        debug: true,
        uniqueIDs: true
    });

    writeActual("agents.4096", snapshot.html);

    assertLess(
        snapshot.html.length / 4,
        4096,
        "Invalid adaptive DOM snapshot size (4096; max)"
    );
    assertMore(
        snapshot.html.length,
        200,
        "Invalid adaptive DOM snapshot size (4096; min)"
    );

    assertIn(
        flattenDOMSnapshot("<a href=\"/about\" data-uid=\"9\">About</a>"),
        flattenDOMSnapshot(snapshot.html),
        "Interactive element not preserved"
    );
});

await test("Take adaptive DOM snapshot (2048)", async() => {
    const snapshot = await adaptiveD2Snap(await readFile("agents"), 2048, 5, {
        debug: true
    });

    writeActual("agents.2048", snapshot.html);

    assertLess(
        snapshot.html.length / 4,
        2048,
        "Invalid adaptive DOM snapshot size (2048; max)"
    );
    assertMore(
        snapshot.html.length,
        200,
        "Invalid adaptive DOM snapshot size (2048; min)"
    );
});

await test("Take DOM snapshot (L)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), 0.3, 0.3, 0.3, {
        debug: true
    });

    writeActual("pizza.l", snapshot.html);
    const expected = readExpected("pizza.l");

    assertAlmostEqual(
        snapshot.meta.originalSize,
        1120,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.44,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (M)", async() => {
    const snapshot = await d2Snap(await readFile("pizza"), 0.4, 0.8, 0.6, {
        debug: true
    });

    writeActual("pizza.m", snapshot.html);
    const expected = readExpected("pizza.m");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.28,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (S)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), 1.0, 1.0, 1.0, {
        debug: true
    });

    writeActual("pizza.s", snapshot.html);
    const expected = readExpected("pizza.s");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.21,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (linearized)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), Infinity, 1, 0, {
        debug: true
    });

    writeActual("pizza.lin", snapshot.html);
    const expected = readExpected("pizza.lin");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.29,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "one**##",
        snapshot.html,
        "Invalid collapsed whitespace in DOM snapshot (1)"
    );

    assertNotIn(
        "MargheritaA",
        snapshot.html,
        "Invalid collapsed whitespace in DOM snapshot (2)"
    );
});

await test("Take DOM snapshot (options.groundTruth + options.groundTruthReplaceDefault)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), 0.3, 0.3, 0.3, {
        debug: true,
        groundTruth: {
            "typeElement": {
                "container": {
                    "ratings": {
                        "div": 0.70
                    }
                },
            },
            "typeAttribute": {
                "ratings": {
                    "required": 0.2,
                    "tabindex": 0.1
                }
            }
        }
    });

    writeActual("pizza.ground-truth", snapshot.html);
    const expected = readExpected("pizza.ground-truth");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    const snapshotReplace = await d2Snap(await readFile("pizza"), 0.3, 0.3, 0.3, {
        debug: true,
        groundTruth: {
            "typeElement": {
                "container": {
                    "tagNames": [
                        "div"
                    ],
                    "ratings": {
                        "div": 0.70
                    },
                    "fallbackRating": 0.5
                },
                "actionable": {
                    "tagNames": []
                },
                "textFormatting": {
                    "tagNames": [
                        "h1"
                    ]
                }
            },
            "typeAttribute": {
                "ratings": {
                    "required": 0.2,
                    "tabindex": 0.1
                },
                "fallbackRating": 0.7
            }
        },
        groundTruthReplaceDefault: true
    });

    writeActual("pizza.ground-truth.replace", snapshotReplace.html);
    const expectedReplace = readExpected("pizza.ground-truth.replace");

    assertEqual(
        flattenDOMSnapshot(snapshotReplace.html),
        flattenDOMSnapshot(expectedReplace),
        "Invalid DOM snapshot (replace)"
    );

    const snapshotAttributeWildcard = await d2Snap(await readFile("pizza"), 0, 0.3, 1, {
        debug: true,
        groundTruth: {
            "typeAttribute": {
                "ratings": {
                    "class": 0,
                    "required": 0,
                    "tabindex": 0,
                    "type": 0,

                    "aria-label": 0.2,
                    "aria-description": 0.4,
                    "aria-*": 0.5,
                    "data-*": 1.0
                }
            }
        }
    });

    writeActual("pizza.ground-truth.attribute-wildcard", snapshotAttributeWildcard.html);
    const expectedARIA = readExpected("pizza.ground-truth.attribute-wildcard");

    assertEqual(
        flattenDOMSnapshot(snapshotAttributeWildcard.html),
        flattenDOMSnapshot(expectedARIA),
        "Invalid DOM snapshot (attribute wildcard suffix '{aria-|data-}*')"
    );
});

await test("Take DOM snapshot (options.skipMarkdown)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), Infinity, 1, 0, {
        debug: true,
        skipMarkdown: true
    });

    writeActual("pizza.options.skip-markdown", snapshot.html);
    const expected = readExpected("pizza.options.skip-markdown");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.debug)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), 0.75, 0.75, 0.75, {
        debug: false
    });

    writeActual("pizza.options.debug", snapshot.html);
    const expected = readExpected("pizza.options.debug");

    assertEqual(
        snapshot.html,
        expected,
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "\n",
        snapshot.html,
        "Invalid DOM snapshot (debug)"
    );

    const snapshotDebug = await d2Snap(await readFile("pizza"), 0.75, 0.75, 0.75, {
        debug: true
    });

    assertIn(
        "\n",
        snapshotDebug.html,
        "Invalid DOM snapshot (debug)"
    );
});

await test("Take DOM snapshot (verbose)", async () => {
    const snapshot = await d2Snap(await readFile("verbose"), 0.6, 0.4, 0.2, {
        debug: true
    });

    writeActual("verbose", snapshot.html);
    const expected = readExpected("verbose");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});