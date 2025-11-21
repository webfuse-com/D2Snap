import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

import { dynamicizeDOM } from "../dynamicize-dom.js";

import { d2Snap, adaptiveD2Snap } from "../dist/api.js";


function path(fileName) {
    return join(import.meta.dirname, `${fileName}.html`);
}

function readFile(fileName) {
    return readFileSync(path(fileName)).toString();
}

async function readFileAsDOM(fileName) {
    return (await dynamicizeDOM(readFile(fileName))).body;
}

function readExpected(domName) {
    return readFile(`${domName}.expected`);
}

function writeActual(domName, html) {
    return writeFileSync(path(`${domName}.dom.actual`), html);
}

function flattenDOMSnapshot(snapshot) {
    return snapshot
        .trim()
        .replace(/\s*(\n|\r)+\s*/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+(?=<)|(?=>)\s+/g, "");
}


await test("Take adaptive DOM snapshot (4096) [DOM]", async () => {
    const snapshot = await adaptiveD2Snap(await readFileAsDOM("agents"), 4096, 5, {
        debug: true,
        assignUniqueIDs: true
    });

    writeActual("agents.4096", snapshot.serializedHtml);

    assertLess(
        snapshot.serializedHtml.length / 4,
        4096,
        "Invalid adaptive DOM snapshot size (4096; max)"
    );
    assertMore(
        snapshot.serializedHtml.length,
        200,
        "Invalid adaptive DOM snapshot size (4096; min)"
    );

    assertIn(
        flattenDOMSnapshot("<a href=\"/about\" data-uid=\"7\">About</a>"),
        flattenDOMSnapshot(snapshot.serializedHtml),
        "Interactive element not preserved"
    );
});

await test("Take adaptive DOM snapshot (2048) [DOM]", async() => {
    const snapshot = await adaptiveD2Snap(await readFileAsDOM("agents"), 2048, 5, {
        debug: true
    });

    writeActual("agents.2048", snapshot.serializedHtml);

    assertLess(
        snapshot.serializedHtml.length / 4,
        2048,
        "Invalid adaptive DOM snapshot size (2048; max)"
    );
    assertMore(
        snapshot.serializedHtml.length,
        200,
        "Invalid adaptive DOM snapshot size (2048; min)"
    );
});

await test("Take DOM snapshot (L) [DOM]", async () => {
    const snapshot = await d2Snap(await readFileAsDOM("pizza"), 0.3, 0.3, 0.3, {
        debug: true
    });

    writeActual("pizza.l", snapshot.serializedHtml);
    const expected = readExpected("pizza.l");

    assertAlmostEqual(
        snapshot.meta.originalSize,
        680,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.45,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (M) [DOM]", async() => {
    const snapshot = await d2Snap(await readFileAsDOM("pizza"), 0.4, 0.6, 0.8, {
        debug: true
    });

    writeActual("pizza.m", snapshot.serializedHtml);
    const expected = readExpected("pizza.m");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.22,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (S) [DOM]", async () => {
    const snapshot = await d2Snap(await readFileAsDOM("pizza"), 1.0, 1.0, 1.0, {
        debug: true
    });

    writeActual("pizza.s", snapshot.serializedHtml);
    const expected = readExpected("pizza.s");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.21,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (linearized) [DOM]", async () => {
    const snapshot = await d2Snap(await readFileAsDOM("pizza"), Infinity, 0, 1.0, {
        debug: true
    });

    writeActual("pizza.lin", snapshot.serializedHtml);
    const expected = readExpected("pizza.lin");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.37,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.keepUnknownElements = false) [DOM]", async () => {
    const snapshot = await d2Snap(await readFileAsDOM("custom"), Infinity, 0, 1.0, {
        debug: true
    });

    writeActual("custom", snapshot.serializedHtml);
    const expected = readExpected("custom");

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.keepUnknownElements = true) [DOM]", async () => {
    const snapshot = await d2Snap(await readFileAsDOM("custom"), Infinity, 0, 1.0, {
        debug: true,
        keepUnknownElements: true
    });

    writeActual("custom.keep", snapshot.serializedHtml);
    const expected = readExpected("custom.keep");

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.skipMarkdownTranslation = true) [DOM]", async () => {
    const snapshot = await d2Snap(await readFile("markdown"), Infinity, 0, 1.0, {
        debug: true,
        skipMarkdownTranslation: true
    });

    writeActual("markdown.keep", snapshot.serializedHtml);
    const expected = readExpected("markdown.skip");

    assertEqual(
        flattenDOMSnapshot(snapshot.serializedHtml),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});