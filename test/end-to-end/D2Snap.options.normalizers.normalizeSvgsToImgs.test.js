import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.normalizers.normalizeSvgsToImgs");


const LABEL_ATTRIBUTE_NAMES = [ "ARIA-LABELLEDBY", "aria-label", "title" ];

const NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG = {
    debug: true,
    filterEmptyElements: false,
    normalizers: [
        defaults.normalizers.filterComments,
        defaults.normalizers.filterDataUrls
    ]
};
const NORMALIZING_DOWNSAMPLING_OPTIONS_ARG = {
    debug: true,
    filterEmptyElements: false,
    normalizers: [
        defaults.normalizers.filterComments,
        (virtualNode, liveNode, context) => defaults.normalizers.normalizeSvgsToImgs(virtualNode, liveNode, context, {
            labelAttributeNames: LABEL_ATTRIBUTE_NAMES
        }),
        (virtualNode, liveNode, context) => defaults.normalizers.normalizeIconClassesToImgs(virtualNode, liveNode, context, {
            iconClassPrefixes: [ "fa", "my-icons" ],
            labelAttributeNames: LABEL_ATTRIBUTE_NAMES
        }),
        (virtualNode, liveNode, context) => defaults.normalizers.normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
            labelAttributeNames: LABEL_ATTRIBUTE_NAMES
        }),
        defaults.normalizers.filterDataUrls
    ]
};


await test("Take DOM snapshot (options.normalizers; normalizeSvgsToImgs)", async () => {
    const snapshotUnnormalized = await d2Snap(HAMBURGER_HTML, 1.0, 1.0, 1.0, NO_NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.options.normalizers.normalizeSvgsToImgs.unnormalized", snapshotUnnormalized.html);
    const expectedUnnormalized = await readExpected("hamburger/hamburger.options.normalizers.normalizeSvgsToImgs.unnormalized");

    assertEqual(
        flattenDOMSnapshot(snapshotUnnormalized.html),
        flattenDOMSnapshot(expectedUnnormalized),
        "Invalid DOM snapshot (unnormalized)"
    );

    const snapshotNormalized = await d2Snap(HAMBURGER_HTML, 1.0, 1.0, 1.0, NORMALIZING_DOWNSAMPLING_OPTIONS_ARG);

    await writeActual("hamburger/hamburger.options.normalizers.normalizeSvgsToImgs.normalized", snapshotNormalized.html);
    const expectedNormalized = await readExpected("hamburger/hamburger.options.normalizers.normalizeSvgsToImgs.normalized");

    assertEqual(
        flattenDOMSnapshot(snapshotNormalized.html),
        flattenDOMSnapshot(expectedNormalized),
        "Invalid DOM snapshot (normalized)"
    );
});