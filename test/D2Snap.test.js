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
        2380,
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
        0.33,
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
        0.27,
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
        0.37,
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

await test("Take DOM snapshot (options.skipTextRank)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), Infinity, 1, 1, {
        debug: true,
        skipTextRank: true
    });

    writeActual("pizza.options.skip-textrank", snapshot.html);
    const expected = readExpected("pizza.options.skip-textrank");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot (without TextRank)"
    );

    const snapshotNoSkip = await d2Snap(await readFile("pizza"), Infinity, 1, 1, {
        debug: true,
        skipTextRank: false
    });

    writeActual("pizza.options.textrank", snapshotNoSkip.html);
    const expectedNoSkip = readExpected("pizza.options.textrank");

    assertEqual(
        flattenDOMSnapshot(snapshotNoSkip.html),
        flattenDOMSnapshot(expectedNoSkip),
        "Invalid DOM snapshot (with TextRank)"
    );
});

// ---------------------------------------------------------------------------
// Cobro <-> D2Snap quality mapping helper.
//
//   cobro `quality` -> d2snap `rE = rA = rT = 1 - quality`
//   (server: src/cobro/app/automation/automation.see.ts:340-349)
//
//   cobro q=0.1  -> d2snap rE=rA=rT=0.9   (HEAVIEST downsampling — what the
//                                         LLM sees in act-only mode)
//   cobro q=0.5  -> d2snap rE=rA=rT=0.5   (medium)
//   cobro q=0.9  -> d2snap rE=rA=rT=0.1   (lightest, near-raw)
//   cobro q=1.0  -> bypass d2snap entirely (handled at the server layer)
//
// The labeledExtract pass is UNCONDITIONAL — it runs before rE/rA/rT pruning
// — so it must yield the same label-preservation guarantee at every cobro q
// in [0, 1). Tests sweep that range to lock the contract in.
// ---------------------------------------------------------------------------
function d2snapArgsForCobroQuality(q) {
    const r = 1 - q;
    return { rE: r, rA: r, rT: r };
}

const FUTURUMSHOP_HAMBURGER_DOM = `<html><body><button class="hamburger js-mobileNavToggle" wf-id="463">
            <svg class="icon-hamburger" aria-label="Open menu" wf-id="465">
                <use href="#icon-hamburger" wf-id="467"></use>
            </svg>
        </button></body></html>`;

const SVG_LABELED_EXTRACT_GROUND_TRUTH = {
    typeElement: {
        labeledExtract: { tagNames: [ "svg" ] }
    },
    typeAttribute: {
        ratings: { "wf-id": 1.0 }
    }
};

for(const cobroQ of [ 0.1, 0.5, 0.9 ]) {
    await test(`Lift svg aria-label out of icon-only button (futurumshop regression, cobro q=${cobroQ})`, async () => {
        // Exact <button> snippet captured from
        // https://www.futurumshop.nl/futurum-jona-merino-fietsshirt-korte-mouwen-lichtblauw-heren.phtml
        // The hamburger menu icon button: no visible text, only the svg's
        // aria-label "Open menu" identifies it.
        //
        // Before labeledExtract, at cobro q=0.1 (d2snap rE=rA=rT=0.9) this
        // collapsed to <button wf-id="463"><svg wf-id="465"></svg></button>
        // — unidentifiable. aria-label was rated 0.6 (dropped at rA=0.9),
        // and even if preserved it would have stayed on the svg, not the
        // button.
        //
        // With svg in labeledExtract, the aria-label is lifted out as a
        // text node BEFORE TextRank / container merging / attribute pruning,
        // so the label survives at every cobro q in [0, 1) — not just at
        // the heavy-downsampling extreme where it would otherwise be lost.
        const { rE, rA, rT } = d2snapArgsForCobroQuality(cobroQ);

        const snapshot = await d2Snap(FUTURUMSHOP_HAMBURGER_DOM, rE, rA, rT, {
            debug: true,
            groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
        });

        writeActual(`futurumshop.hamburger.q=${cobroQ}`, snapshot.html);

        assertIn(
            "Open menu",
            snapshot.html,
            `Icon button's aria-label was lost at cobro q=${cobroQ}`
        );
        assertNotIn(
            "<svg",
            snapshot.html,
            `Empty <svg> wrapper leaked through labeledExtract at cobro q=${cobroQ}`
        );
        assertIn(
            "<button",
            snapshot.html,
            `Actionable <button> was lost at cobro q=${cobroQ}`
        );
        assertIn(
            "wf-id=\"463\"",
            snapshot.html,
            `Button's wf-id interaction handle was lost at cobro q=${cobroQ}`
        );
    });
}

await test("Lift svg aria-label out of icon-only button at d2snap rE=rA=rT=1.0 (maximum downsampling)", async () => {
    // Edge: the most aggressive setting d2snap accepts (cobro q=0). Even
    // here labeledExtract must preserve the label.
    const snapshot = await d2Snap(FUTURUMSHOP_HAMBURGER_DOM, 1.0, 1.0, 1.0, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertIn("Open menu", snapshot.html, "Label lost at maximum downsampling");
    assertNotIn("<svg", snapshot.html, "Empty <svg> survived at maximum downsampling");
});

await test("Drop labeledExtract element with no recoverable label (cobro q=0.1)", async () => {
    // Decorative SVG with no aria-label, no title attr, no <title> child —
    // pure cosmetic icon, nothing to surface. The svg should disappear,
    // leaving the actionable button as a bare interaction handle.
    const { rE, rA, rT } = d2snapArgsForCobroQuality(0.1);
    const dom = `<html><body><button wf-id="1"><svg wf-id="2"><path d="M0,0L10,10"/></svg></button></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertNotIn("<svg", snapshot.html, "Unlabeled svg should have been dropped");
    assertIn("<button", snapshot.html, "Button must remain");
});

await test("labeledExtract recovers label from <title> child element (cobro q=0.1)", async () => {
    // The "proper" accessibility pattern: SVG with a <title> child element
    // rather than aria-label. Common in icon-font frameworks (Octicons etc.)
    // and in some component libraries.
    const { rE, rA, rT } = d2snapArgsForCobroQuality(0.1);
    const dom = `<html><body><a href="/trash" wf-id="9"><svg wf-id="10"><title>Delete item</title><path d="M0,0"/></svg></a></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertIn("Delete item", snapshot.html, "Label from <title> child was not lifted");
    assertNotIn("<svg", snapshot.html, "svg wrapper should be gone");
    assertIn("href=\"/trash\"", snapshot.html, "Anchor href must be preserved");
});

await test("labeledExtract is no-op when default ground-truth list is empty (cobro q=0.1)", async () => {
    // Sanity check: pre-fix behaviour must still be reachable. With the
    // default ground truth (no labeledExtract entry), svg passes through
    // untouched.
    const { rE, rA, rT } = d2snapArgsForCobroQuality(0.1);
    const dom = `<html><body><button wf-id="1"><svg aria-label="X" wf-id="2"></svg></button></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: { typeAttribute: { ratings: { "wf-id": 1.0 } } }
    });

    // No labeledExtract config → svg survives.
    assertIn("<svg", snapshot.html, "Default (empty list) labeledExtract should not strip svg");
});

await test("Markdown pass terminates on Turndown HTML passthrough (table without <thead>)", async () => {
    // Regression: Turndown's gfm plugin passes <table> elements without a
    // <thead> through as raw HTML. The textFormatting pass returned the
    // markdown fragment for re-traversal so nested elements like <em>
    // inside a kept <button> get converted; but a passed-through <table>
    // re-parsed into another <table>, which fed itself back into Turndown
    // forever. Real-world reproducer: futurumshop product page (>1MB HTML
    // with <table class="product-description-table"> and no <thead>).
    // Asserts termination via a hard wall-clock budget — if the loop is
    // reintroduced, this hangs and the test runner times out.
    const dom = `<html><body><table class="product-description-table">
        <tbody>
            <tr><td>Ademend vermogen:</td><td>5/5</td></tr>
            <tr><td>Gewicht:</td><td>150g</td></tr>
        </tbody>
    </table></body></html>`;

    const start = Date.now();
    const snapshot = await d2Snap(dom, 0.5, 0.5, 0.5, { debug: true });
    const elapsedMs = Date.now() - start;

    assertLess(elapsedMs, 2000, `Markdown pass took ${elapsedMs}ms — infinite-loop regression?`);
    assertIn("Ademend vermogen", snapshot.html, "Table content was lost");
});

await test("Markdown pass converts nested textFormatting inside kept actionable (<em> in <button>)", async () => {
    // Regression guard for the OTHER side of the fix: the textFormatting
    // pass MUST still re-traverse markdown-replacement fragments so that
    // nested textFormatting elements (e.g. <em>) inside a kept actionable
    // (e.g. <button>) get converted. Without re-traversal, <em> would
    // survive as raw HTML instead of being rendered as _i_.
    const dom = `<html><body><li>Info <button onclick="x()"><em>i</em></button></li></body></html>`;

    const snapshot = await d2Snap(dom, 0.3, 0.3, 0.3, { debug: true });

    assertIn("_i_", snapshot.html, "<em> inside kept <button> was not converted to markdown");
    assertNotIn("<em>", snapshot.html, "Raw <em> leaked through textFormatting pass");
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