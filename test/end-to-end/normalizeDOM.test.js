import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { normalizeDOM, defaults } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.normalizeDOM");


await test("Normalize DOM (defaults)", async () => {
    const normalized = await normalizeDOM(HAMBURGER_HTML);

    await writeActual("hamburger/hamburger.normalizeDOM.defaults", normalized.html);
    const expected = await readExpected("hamburger/hamburger.normalizeDOM.defaults");

    assertEqual(
        flattenDOMSnapshot(normalized.html),
        flattenDOMSnapshot(expected),
        "Invalid normalized DOM"
    );

    // Normalized
    assertNotIn("<script", normalized.html, "Invalid normalized DOM (noise element not filtered)");
    assertNotIn("<!--", normalized.html, "Invalid normalized DOM (comment not filtered)");
    assertNotIn("data:image", normalized.html, "Invalid normalized DOM (data URL not filtered)");
    assertIn("<img alt=\"Cart\">", normalized.html, "Invalid normalized DOM (SVG not normalized)");

    // Not downsampled
    assertIn("<h1>Our Burgers</h1>", normalized.html, "Invalid normalized DOM (text element downsampled)");
    assertIn("class=\"card\"", normalized.html, "Invalid normalized DOM (attribute downsampled)");
    assertIn("<section", normalized.html, "Invalid normalized DOM (container element downsampled)");
});

await test("Normalize DOM (custom normalizers)", async () => {
    const normalized = await normalizeDOM(HAMBURGER_HTML, {
        normalizers: [
            defaults.normalizers.filterComments,
            (virtualNode, liveNode, context) => defaults.normalizers.normalizeIconClassesToImgs(virtualNode, liveNode, context, {
                iconClassPrefixes: [ "fa" ]
            })
        ]
    });

    await writeActual("hamburger/hamburger.normalizeDOM.custom", normalized.html);
    const expected = await readExpected("hamburger/hamburger.normalizeDOM.custom");

    assertEqual(
        flattenDOMSnapshot(normalized.html),
        flattenDOMSnapshot(expected),
        "Invalid normalized DOM"
    );

    assertIn("<img alt=\"user\">", normalized.html, "Invalid normalized DOM (icon class not normalized)");
    assertIn("<script", normalized.html, "Invalid normalized DOM (unlisted normalizer applied)");
    assertIn("<svg", normalized.html, "Invalid normalized DOM (unlisted normalizer applied)");
});

await test("Normalize DOM (live DOM)", async () => {
    const dom = new JSDOM(HAMBURGER_HTML).window;
    const liveHTML = dom.document.documentElement.outerHTML;

    const normalized = await normalizeDOM(dom.document);

    assertTrue(normalized.dom.ownerDocument !== dom.document, "Invalid normalized DOM (not a virtual DOM)");
    assertEqual(dom.document.documentElement.outerHTML, liveHTML, "Live DOM was mutated");

    const normalizedWithIDs = await normalizeDOM(dom.document, {
        uniqueIDs: true
    });

    assertIn(" data-uid=", normalizedWithIDs.html, "Invalid normalized DOM (no unique IDs)");
    assertEqual(
        dom.document.documentElement.outerHTML.replace(/ data-uid="\d+"/g, ""),
        liveHTML,
        "Live DOM was mutated beyond unique IDs"
    );
});