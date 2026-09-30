import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const _DOWNSAMPLING_OPTIONS_ARG_BASE = {
    debug: true,
    filter: {
        attributes: [],
        elements: [],
        emptyElements: false
    }
};
const NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG = {
    ..._DOWNSAMPLING_OPTIONS_ARG_BASE,

    normalize: {
        iconfontsFromNames: [],
        labelsFromAttributes: [],
        svgToImg: false
    }
};
const NORMALIZING_DOWNSAMPLING_OPTIONS_ARG = {
    ..._DOWNSAMPLING_OPTIONS_ARG_BASE,

    normalize: {
        iconfontsFromNames: [ "fa", "icon" ],
        labelsFromAttributes: [ "ARIA-LABELLEDBY", "aria-label", "title" ],
        svgToImg: true
    }
};


await test("Take DOM snapshot (idiomatic, no normalization necessary)", async () => {
    const hamburgerHTML = await readTestFile("hamburger/hamburger.idiomatic");

    const snapshot = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0);

    await writeActual("hamburger/hamburger.idiomatic", snapshot.html);
    const expected = await readExpected("hamburger/hamburger.idiomatic");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.filter.normalize; no-text)", async () => {
    const hamburgerHTML = await readTestFile("hamburger/hamburger.no-text");

    const snapshotUnnormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.no-text.unnormalized", snapshotUnnormalized.html);
    const expectedUnnormalized = await readExpected("hamburger/hamburger.no-text.unnormalized");

    assertEqual(
        flattenDOMSnapshot(snapshotUnnormalized.html),
        flattenDOMSnapshot(expectedUnnormalized),
        "Invalid DOM snapshot (unnormalized)"
    );

    const snapshotNormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.no-text.normalized", snapshotNormalized.html);
    const expectedNormalized = await readExpected("hamburger/hamburger.no-text.normalized");

    assertEqual(
        flattenDOMSnapshot(snapshotNormalized.html),
        flattenDOMSnapshot(expectedNormalized),
        "Invalid DOM snapshot (normalized)"
    );
});

await test("Take DOM snapshot (options.filter.normalize; img.no-alt)", async () => {
    const hamburgerHTML = await readTestFile("hamburger/hamburger.img.no-alt");

    const snapshotUnnormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.no-alt.unnormalized", snapshotUnnormalized.html);
    const expectedUnnormalized = await readExpected("hamburger/hamburger.img.no-alt.unnormalized");

    assertEqual(
        flattenDOMSnapshot(snapshotUnnormalized.html),
        flattenDOMSnapshot(expectedUnnormalized),
        "Invalid DOM snapshot (unnormalized)"
    );

    const snapshotNormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.no-alt.normalized", snapshotNormalized.html);
    const expectedNormalized = await readExpected("hamburger/hamburger.img.no-alt.normalized");

    assertEqual(
        flattenDOMSnapshot(snapshotNormalized.html),
        flattenDOMSnapshot(expectedNormalized),
        "Invalid DOM snapshot (normalized)"
    );
});

await test("Take DOM snapshot (options.filter.normalize; img.svg)", async () => {
    const hamburgerHTML = await readTestFile("hamburger/hamburger.img.svg");

    const snapshotUnnormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.svg.unnormalized", snapshotUnnormalized.html);
    const expectedUnnormalized = await readExpected("hamburger/hamburger.img.svg.unnormalized");

    assertEqual(
        flattenDOMSnapshot(snapshotUnnormalized.html),
        flattenDOMSnapshot(expectedUnnormalized),
        "Invalid DOM snapshot (unnormalized)"
    );

    const snapshotNormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.svg.normalized", snapshotNormalized.html);
    const expectedNormalized = await readExpected("hamburger/hamburger.img.svg.normalized");

    assertEqual(
        flattenDOMSnapshot(snapshotNormalized.html),
        flattenDOMSnapshot(expectedNormalized),
        "Invalid DOM snapshot (normalized)"
    );
});

await test("Take DOM snapshot (options.filter.normalize; img.iconfont)", async () => {
    const hamburgerHTML = await readTestFile("hamburger/hamburger.img.iconfont");

    const snapshotUnnormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.iconfont.unnormalized", snapshotUnnormalized.html);
    const expectedUnnormalized = await readExpected("hamburger/hamburger.img.iconfont.unnormalized");

    assertEqual(
        flattenDOMSnapshot(snapshotUnnormalized.html),
        flattenDOMSnapshot(expectedUnnormalized),
        "Invalid DOM snapshot (unnormalized)"
    );

    const snapshotNormalized = await d2Snap(hamburgerHTML, 1.0, 1.0, 1.0, NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.img.iconfont.normalized", snapshotNormalized.html);
    const expectedNormalized = await readExpected("hamburger/hamburger.img.iconfont.normalized");

    assertEqual(
        flattenDOMSnapshot(snapshotNormalized.html),
        flattenDOMSnapshot(expectedNormalized),
        "Invalid DOM snapshot (normalized)"
    );
});