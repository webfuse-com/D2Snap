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
        .replace(/\s*(\n|\r)+\s*/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+(?=<)|(?=>)\s+/g, "");
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
        680,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.4,
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
        0.2,
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
        0.18,
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
    const snapshot = await d2Snap(await readFile("pizza"), Infinity, 1.0, 0, {
        debug: true
    });

    writeActual("pizza.lin", snapshot.html);
    const expected = readExpected("pizza.lin");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.35,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.groundTruth default)", async () => {
    const snapshot = await d2Snap(await readFile("options.gt"), 0.5, 0.5, 0.0, {
        debug: true
    });

    writeActual("options.gt.0", snapshot.html);
    const expected = readExpected("options.gt.0");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.groundTruth custom)", async () => {
    const snapshot = await d2Snap(await readFile("options.gt"), 0.5, 0.5, 0.0, {
        debug: true,
        groundTruth: {
            "typeElement": {
                "container": {
                    "tagNames": [
                        "div"
                    ],
                    "ratings": {
                        "div": 0.5
                    },
                    "fallbackRating": 1.0
                },
                "textFormatting": {
                    "tagNames": [
                        "h1",
                        "h2"
                    ]
                }
            },
            "typeAttribute": {
                "ratings": {
                    "id": 0.1
                },
                "fallbackRating": 1.0
            }
        }
    });

    writeActual("options.gt.1", snapshot.html);
    const expected = readExpected("options.gt.1");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.skipMarkdown = true)", async () => {
    const snapshot = await d2Snap(await readFile("options.sm"), Infinity, 1.0, 0, {
        debug: true,
        skipMarkdown: true
    });

    writeActual("options.sm.true", snapshot.html);
    const expected = readExpected("options.sm.true");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});