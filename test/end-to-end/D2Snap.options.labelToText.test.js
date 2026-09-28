import { readTestFile, writeActual } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger");


// ---------------------------------------------------------------------------
// Exact <button> snippet captured from
// https://www.futurumshop.nl/futurum-jona-merino-fietsshirt-korte-mouwen-lichtblauw-heren.phtml
// The hamburger menu icon button: no visible text, only the svg's aria-label
// "Open menu" identifies it. Without replaceWithLabel, at q=0.1 this collapses
// to <button><svg></svg></button> — unidentifiable.
// aria-label was rated 0.6 (dropped at rA=0.9), and even if preserved it would
// have stayed on the svg, not the button.
// With svg in replaceWithLabel, the aria-label is lifted out as a text node
// BEFORE TextRank / container merging / attribute pruning, so the label survives
// at every q in [0, 1) — not just at the heavy-downsampling extreme where it
// would otherwise be lost.
// ---------------------------------------------------------------------------
for(const ratio of [ 0.3, 0.6, 0.9 ]) {
    await test(`Lift svg aria-label out of icon-only button`, async () => {
        const snapshot = await d2Snap(HAMBURGER_HTML, ratio, ratio, ratio, {
            debug: true,
            liftImageDescription: true
        });

        await writeActual(`hamburger/hamburger.r=${ratio}`, snapshot.html);

        assertIn(
            "Open menu",
            snapshot.html,
            `Icon button's aria-label was lost at r=${ratio}`
        );
        assertNotIn(
            "<svg",
            snapshot.html,
            `Empty <svg> wrapper leaked through replaceWithLabel at r=${ratio}`
        );
        assertIn(
            "<button",
            snapshot.html,
            `Actionable <button> was lost at r=${ratio}`
        );
    });
}

await test("Lift svg aria-label out of icon-only button at D2Snap rE=rA=rT=1.0 (maximum downsampling)", async () => {
    // Edge: the most aggressive setting D2Snap accepts (q=0). Even
    // here replaceWithLabel must preserve the label.
    const snapshot = await d2Snap(HAMBURGER_HTML, 1.0, 1.0, 1.0, {
        debug: true,
		labelToText: {
            tagNames: [ "IMG", "SVG" ]
        }
    });

    assertIn("Open menu", snapshot.html, "Label lost at maximum downsampling");
    assertNotIn("<svg", snapshot.html, "Empty <svg> survived at maximum downsampling");
});

await test("Drop replaceWithLabel element with no recoverable label (r=0.9)", async () => {
    // Decorative SVG with no aria-label, no title attr, no <title> child —
    // pure cosmetic icon, nothing to surface. The svg should disappear,
    // leaving the actionable button as a bare interaction handle.
    const dom = `<html><body><button><svg><path d="M0,0L10,10"/></svg></button></body></html>`;

    const snapshot = await d2Snap(dom, 0.9, 0.9, 0.9, {
        debug: true
    });

    assertNotIn("<svg", snapshot.html, "Unlabeled svg should have been dropped");
    assertIn("<button", snapshot.html, "Button must remain");
});

await test("replaceWithLabel recovers label from <title> child element (r=0.9)", async () => {
    // The "proper" accessibility pattern: SVG with a <title> child element
    // rather than aria-label. Common in icon-font frameworks (Octicons etc.)
    // and in some component libraries.
    const html = `<html><body><a href="/trash"><svg><title>Delete item</title><path d="M0,0"/></svg></a></body></html>`;

    const snapshot = await d2Snap(html, 0.9, 0.9, 0.9, {
        debug: true,
		labelToText: {
            tagNames: [ "IMG", "SVG" ]
        }
    });

    assertIn("Delete item", snapshot.html, "Label from <title> child was not lifted");
    assertNotIn("<svg", snapshot.html, "svg wrapper should be gone");
    assertIn("href=\"/trash\"", snapshot.html, "Anchor href must be preserved");
});