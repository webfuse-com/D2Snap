import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { adaptiveD2Snap, d2Snap } from "../dist.lib/api.js";


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

await test("Take adaptive DOM snapshot (2048)", async () => {
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
        2580,
        -1,
        "Invalid DOM snapshot original size"
    );

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.47,
        2,
        "Invalid DOM snapshot size ratio"
    );

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (M)", async () => {
    const snapshot = await d2Snap(await readFile("pizza"), 0.4, 0.8, 0.6, {
        debug: true
    });

    writeActual("pizza.m", snapshot.html);
    const expected = readExpected("pizza.m");

    assertAlmostEqual(
        snapshot.meta.sizeRatio,
        0.34,
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
        0.29,
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
    const snapshot = await d2Snap(await readFile("pizza"), 0.7, 0.8, 1, {
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

await test("Take DOM snapshot (options.filterDataURLs)", async () => {
    const snapshotFilter = await d2Snap(await readFile("pizza"), 0.5, 1, 1, {
        filterDataURLs: true,
        debug: false
    });

    assertNotIn(
        "data:image/png;base64,",
        snapshotFilter.html,
        "Invalid DOM snapshot"
    );
    const snapshotNoFilter = await d2Snap(await readFile("pizza"), 0.5, 1, 1, {
        filterDataURLs: false,
        debug: false
    });

    assertIn(
        "data:image/png;base64,",
        snapshotNoFilter.html,
        "Invalid DOM snapshot"
    );
});

await test("Take DOM snapshot (options.filterEmptyElements)", async () => {
    const snapshotFilter = await d2Snap(await readFile("pizza"), 0, 1, 1, {
        filterEmptyElements: true,
        debug: false
    });

    assertNotIn(
        "<div></div>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "<br>",
        flattenDOMSnapshot(snapshotFilter.html),
        "Invalid DOM snapshot"
    );

    const snapshotNoFilter = await d2Snap(await readFile("pizza"), 0, 1, 1, {
        filterEmptyElements: false,
        debug: false
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
});

await test("Take DOM snapshot (options.debug)", async () => {
    const snapshotNoDebug = await d2Snap(await readFile("pizza"), 0.75, 0.75, 0.75, {
        debug: false
    });

    writeActual("pizza.options.no-debug", snapshotNoDebug.html);
    const expected = readExpected("pizza.options.no-debug");

    assertEqual(
        snapshotNoDebug.html,
        expected,
        "Invalid DOM snapshot"
    );

    assertNotIn(
        "\n",
        snapshotNoDebug.html,
        "Invalid DOM snapshot (no debug)"
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

// ---------------------------------------------------------------------------
// Downsampling ratio <-> Quality ratio:
//
//   `quality` -> D2snap `rE = rA = rT = 1 - quality`
//
//   q=0.1  -> D2snap rE=rA=rT=0.9   (HEAVIEST downsampling — what the
//                                         LLM sees in act-only mode)
//   q=0.5  -> D2snap rE=rA=rT=0.5   (medium)
//   q=0.9  -> D2snap rE=rA=rT=0.1   (lightest, near-raw)
//
// The replaceWithLabel pass is UNCONDITIONAL — it runs before rE/rA/rT pruning
// — so it must yield the same label-preservation guarantee at every quality in
// [0, 1). Tests sweep that range to lock the contract in.
// ---------------------------------------------------------------------------
function downsamplingRatioToQualityRatio(q) {
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
        replaceWithLabel: { tagNames: ["svg"] }
    },
    typeAttribute: {
        ratings: { "wf-id": 1.0 }
    }
};

for (const cobroQ of [0.1, 0.5, 0.9]) {
    await test(`Lift svg aria-label out of icon-only button (futurumshop regression, cobro q=${cobroQ})`, async () => {
        // Exact <button> snippet captured from
        // https://www.futurumshop.nl/futurum-jona-merino-fietsshirt-korte-mouwen-lichtblauw-heren.phtml
        // The hamburger menu icon button: no visible text, only the svg's
        // aria-label "Open menu" identifies it.
        //
        // Before replaceWithLabel, at cobro q=0.1 (D2Snap rE=rA=rT=0.9) this
        // collapsed to <button wf-id="463"><svg wf-id="465"></svg></button>
        // — unidentifiable. aria-label was rated 0.6 (dropped at rA=0.9),
        // and even if preserved it would have stayed on the svg, not the
        // button.
        //
        // With svg in replaceWithLabel, the aria-label is lifted out as a
        // text node BEFORE TextRank / container merging / attribute pruning,
        // so the label survives at every cobro q in [0, 1) — not just at
        // the heavy-downsampling extreme where it would otherwise be lost.
        const { rE, rA, rT } = downsamplingRatioToQualityRatio(cobroQ);

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
            `Empty <svg> wrapper leaked through replaceWithLabel at cobro q=${cobroQ}`
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

await test("Lift svg aria-label out of icon-only button at D2Snap rE=rA=rT=1.0 (maximum downsampling)", async () => {
    // Edge: the most aggressive setting D2Snap accepts (cobro q=0). Even
    // here replaceWithLabel must preserve the label.
    const snapshot = await d2Snap(FUTURUMSHOP_HAMBURGER_DOM, 1.0, 1.0, 1.0, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertIn("Open menu", snapshot.html, "Label lost at maximum downsampling");
    assertNotIn("<svg", snapshot.html, "Empty <svg> survived at maximum downsampling");
});

await test("Drop replaceWithLabel element with no recoverable label (cobro q=0.1)", async () => {
    // Decorative SVG with no aria-label, no title attr, no <title> child —
    // pure cosmetic icon, nothing to surface. The svg should disappear,
    // leaving the actionable button as a bare interaction handle.
    const { rE, rA, rT } = downsamplingRatioToQualityRatio(0.1);
    const dom = `<html><body><button wf-id="1"><svg wf-id="2"><path d="M0,0L10,10"/></svg></button></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertNotIn("<svg", snapshot.html, "Unlabeled svg should have been dropped");
    assertIn("<button", snapshot.html, "Button must remain");
});

await test("replaceWithLabel recovers label from <title> child element (cobro q=0.1)", async () => {
    // The "proper" accessibility pattern: SVG with a <title> child element
    // rather than aria-label. Common in icon-font frameworks (Octicons etc.)
    // and in some component libraries.
    const { rE, rA, rT } = downsamplingRatioToQualityRatio(0.1);
    const dom = `<html><body><a href="/trash" wf-id="9"><svg wf-id="10"><title>Delete item</title><path d="M0,0"/></svg></a></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: SVG_LABELED_EXTRACT_GROUND_TRUTH
    });

    assertIn("Delete item", snapshot.html, "Label from <title> child was not lifted");
    assertNotIn("<svg", snapshot.html, "svg wrapper should be gone");
    assertIn("href=\"/trash\"", snapshot.html, "Anchor href must be preserved");
});

await test("replaceWithLabel is no-op when default ground-truth list is empty (cobro q=0.1)", async () => {
    // Sanity check: pre-fix behaviour must still be reachable. With the
    // default ground truth (no replaceWithLabel entry), svg passes through
    // untouched.
    const { rE, rA, rT } = downsamplingRatioToQualityRatio(0.1);
    const dom = `<html><body><button wf-id="1"><svg aria-label="X" wf-id="2"></svg></button></body></html>`;

    const snapshot = await d2Snap(dom, rE, rA, rT, {
        debug: true,
        groundTruth: { typeAttribute: { ratings: { "wf-id": 1.0 } } }
    });

    // No replaceWithLabel config → svg survives.
    assertIn("<svg", snapshot.html, "Default (empty list) replaceWithLabel should not strip svg");
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

await test("Container merge never moves content into a void element", async () => {
    // Root cause of the futurumshop collapse: void elements (<br>, <img>, ...)
    // are not listed in the ground truth, so the "custom element is a
    // container" heuristic classifies them as containers — and with a high
    // container fallbackRating they outrank their parent. A top-down merge then
    // moves the parent's children INTO the void element, which serializes
    // without children, silently destroying everything around it.
    const gt = {
        typeElement: {
            container: { tagNames: ["body", "div"], ratings: { body: 0.9, div: 0.3 }, fallbackRating: 1.0 }
        },
        typeAttribute: { ratings: { id: 0.8 }, fallbackRating: 0.5 }
    };
    for (const voidTag of ["br", "img", "hr", "wbr"]) {
        const dom = `<html><body><div id="d"><${voidTag}><p>IMPORTANT CONTENT one two three four five.</p></div></body></html>`;
        const snapshot = await d2Snap(dom, 0.9, 0.9, 0.9, { debug: true, groundTruth: gt, groundTruthReplaceDefault: true });

        assertIn("IMPORTANT CONTENT", snapshot.html, `Content was merged into void <${voidTag}> and lost`);
    }
});

await test("Markdown autolink URL does not become a bogus container element", async () => {
    // A URL wrapped in angle brackets — a markdown autolink, or markdown's
    // pointy-bracket destination syntax that Turndown emits for URLs CONTAINING
    // SPACES (`<https://host/a b c.svg>`) — re-parses via createContextualFragment
    // into a bogus `<https:>` element (path/space segments become attributes).
    // That element then acts as a container (fallbackRating 1.0) and swallows
    // its siblings, renaming a real section to `<https:>`. Seen on the
    // futurumshop page: `<https: fonl="" futurum="" ... wf-id="1817">`.
    const gt = {
        typeElement: {
            container: { tagNames: ["body", "main", "section"], ratings: { body: 0.9, main: 0.85, section: 0.8 }, fallbackRating: 1.0 },
            textFormatting: { tagNames: ["p", "span"] }
        },
        typeAttribute: { ratings: { id: 0.8 }, fallbackRating: 0.5 }
    };
    for (const url of ["https://example.com", "https://assets.example.com/a/FUTURUM Icon 19 UV.svg", "mailto:x@y.com"]) {
        const dom = `<html><body><main><section><p>before</p><p>See &lt;${url}&gt; here</p></section><section><p>IMPORTANT trailing content one two three.</p></section></main></body></html>`;
        const snapshot = await d2Snap(dom, 0.9, 0.9, 0.9, { debug: true, groundTruth: gt, groundTruthReplaceDefault: true });

        assertNotIn("<https:", snapshot.html, `URL <${url}> re-parsed into a bogus <https:> element`);
        assertNotIn("<mailto:", snapshot.html, `URL <${url}> re-parsed into a bogus <mailto:> element`);
        assertIn("IMPORTANT trailing content", snapshot.html, `Content swallowed by bogus element from <${url}>`);
    }

    // Unwrapping the bogus `<scheme:>` elements must NOT disturb a kept
    // actionable (`<a …>`) sitting alongside the autolink in the same markdown.
    const linkGt = {
        typeElement: {
            container: { tagNames: ["body", "main", "p"], ratings: { body: 0.9, main: 0.85, p: 0.5 }, fallbackRating: 1.0 },
            actionable: { tagNames: ["a"] }
        },
        typeAttribute: { ratings: { href: 0.9 }, fallbackRating: 0.5 }
    };
    const linkDom = `<html><body><main><p>visit &lt;https://example.com follow <a href="https://kept.example/x">KEPTLINK</a> now</p></main></body></html>`;
    const linkSnapshot = await d2Snap(linkDom, 0.9, 0.9, 0.9, { debug: true, groundTruth: linkGt, groundTruthReplaceDefault: true });
    assertIn(`href="https://kept.example/x"`, linkSnapshot.html, "Kept anchor's href was corrupted by autolink stripping");
    assertIn("KEPTLINK", linkSnapshot.html, "Kept anchor text was lost");
});

// ---------------------------------------------------------------------------
// setAttribute crash isolation: a container element carrying a Vue / Angular
// framework attribute (@click, *ngIf, :href) is involved in a top-down merge.
// The merge copies source attributes onto the target via setAttribute(); those
// names violate the DOM Name production and throw InvalidCharacterError in both
// browsers and JSDOM. The fix checks `e.name` instead of `instanceof DOMException`
// because JSDOM's DOMException class is not the same object as globalThis.DOMException,
// making instanceof return false and the exception escape.
// ---------------------------------------------------------------------------
await test("Container top-down merge does not crash on framework attribute names (@click, *ngIf, :href)", async () => {
    // GT: body and section both containers, div (low) rating < section (high) rating
    // → top-down merge is triggered for section, copying div's attrs to section.
    const gt = {
        typeElement: {
            container: {
                tagNames: ["div", "section"],
                ratings: { div: 0.3, section: 0.8 }
            }
        },
        typeAttribute: { ratings: {}, fallbackRating: 0.5 }
    };
    for (const [name, val] of [["@click", "doIt()"], ["*ngIf", "show"], [":href", "/path"]]) {
        // Place the framework attribute on the low-rating div (= sourceElement in
        // top-down merge), which forces setAttribute() to be called with it.
        const dom = `<html><body><div ${name}="${val}"><section><p>IMPORTANT content</p></section></div></body></html>`;
        const snapshot = await d2Snap(dom, 1.0, 1.0, 1.0, {
            groundTruth: gt,
            groundTruthReplaceDefault: true
        });
        assertIn("IMPORTANT content", snapshot.html,
            `Content lost when merging element carrying framework attr ${name}`);
    }
});

// ---------------------------------------------------------------------------
// Scheme-tag regex guard: namespace-qualified custom elements (FB:LIKE style)
// must NOT be unwrapped by unwrapColonTaggedElements. The COLON_SCHEME_TAG_REGEX
// negative lookahead only skips matches where a valid XML NCName follows the
// colon, so FB:LIKE / NS:WIDGET are preserved while MAILTO:X@Y.COM is stripped.
// ---------------------------------------------------------------------------
await test("Namespace-qualified custom elements (FB:LIKE style) are not unwrapped as scheme artifacts", async () => {
    // ns:widget is in the actionable list so Turndown keeps its outerHTML verbatim.
    // createContextualFragment then parses it back with tagName NS:WIDGET, and
    // unwrapColonTaggedElements must leave it intact (regex must not match).
    const gt = {
        typeElement: {
            container: {
                tagNames: ["body", "section"],
                ratings: { body: 0.9, section: 0.8 }
            },
            actionable: { tagNames: ["ns:widget"] },
            textFormatting: { tagNames: ["p"] }
        },
        typeAttribute: { ratings: {}, fallbackRating: 0.5 }
    };
    const dom = `<html><body><section><p>visit <ns:widget>KEPTCONTENT</ns:widget> for help</p></section></body></html>`;
    const snapshot = await d2Snap(dom, 0.9, 0.9, 0.9, {
        groundTruth: gt,
        groundTruthReplaceDefault: true
    });
    assertIn("KEPTCONTENT", snapshot.html,
        "Namespace-qualified element content was stripped (false positive in scheme regex)");
});

// ---------------------------------------------------------------------------
// End-to-end regression guard on the full, real-world futurumshop product
// page (~1MB). Three regressions converge on this single fixture:
//
//   1. Void-element merge — <br>/<img> etc. classified as containers get
//      content merged into them and dropped on serialization. This is what
//      cratered the survey: q<=0.8 snapshots fell from ~150KB to ~2KB. It only
//      surfaces with a ground truth where `span` is `textFormatting` (so the
//      surrounding spans are non-containers), which is why we use one here.
//   2. Markdown re-traversal — commit 034a010 fed Turndown's own output back
//      through the textFormatting pass, spinning on passthrough HTML (the
//      infinite loop / mem leak fixed in 71aee90).
//   3. setAttribute crash — the top-down merge copies a child's attributes
//      onto its parent via setAttribute(). Framework attribute names that fail
//      the DOM Name production (Vue's `@click`) throw InvalidCharacterError and
//      abort the snapshot. This page has `@click="autoCloseProfile($event)"`.
//
// The GT below mirrors the deployed cobro ground truth (span as textFormatting,
// svg as replaceWithLabel, container fallbackRating 1.0) so this fixture exercises
// the real-world collapse path.
// ---------------------------------------------------------------------------
const COBRO_LIKE_GROUND_TRUTH = {
    typeElement: {
        container: {
            tagNames: ["article", "aside", "body", "div", "footer", "header", "html", "main", "nav", "section"],
            ratings: { article: 0.95, body: 0.9, header: 0.75, main: 0.85, nav: 0.8, section: 0.9, footer: 0.7, aside: 0.85, div: 0.3, html: 0.1 },
            fallbackRating: 1.0
        },
        actionable: { tagNames: ["a", "button", "details", "form", "input", "label", "select", "summary", "textarea"] },
        replaceWithLabel: { tagNames: ["svg"] },
        textFormatting: { tagNames: ["b", "em", "strong", "small", "span", "p", "ul", "ol", "li", "table", "tbody", "tr", "td", "th", "thead", "h1", "h2", "h3", "h4", "h5", "h6", "img", "hr", "code", "pre", "blockquote", "figure", "figcaption", "sub", "sup", "address"] }
    },
    typeAttribute: { ratings: { "wf-id": 1.0, alt: 0.9, href: 0.9, src: 0.8, id: 0.8, class: 0.7, "aria-*": 0.6 }, fallbackRating: 0.5 }
};

for (const cobroQ of [0.1, 0.5, 0.9]) {
    await test(`Snapshot full futurumshop product page without crash or collapse (cobro q=${cobroQ})`, async () => {
        const dom = readFile("futurumshop.product");
        const { rE, rA, rT } = downsamplingRatioToQualityRatio(cobroQ);

        const start = Date.now();
        const snapshot = await d2Snap(dom, rE, rA, rT, {
            debug: true,
            uniqueIDs: true,
            groundTruth: COBRO_LIKE_GROUND_TRUTH,
            groundTruthReplaceDefault: true
        });
        const elapsedMs = Date.now() - start;

        writeActual(`futurumshop.product.q=${cobroQ}`, snapshot.html);

        assertLess(elapsedMs, 10000, `Snapshot took ${elapsedMs}ms — re-traversal blow-up regression?`);
        // THE regression threshold: the collapse sheared this >1MB page down to
        // ~1.8KB at aggressive quality (the survey showed q=0.1 at 1,766 bytes
        // instead of ~150KB). A healthy snapshot must stay above 100KB even at
        // the most aggressive cobro q=0.1.
        assertMore(
            snapshot.html.length,
            100 * 1024,
            `Snapshot collapsed to ${snapshot.html.length} bytes (< 100KB) — content was destroyed`
        );
        assertIn(
            "Merino Fietsshirt Korte Mouwen Lichtblauw Heren",
            snapshot.html,
            "Product title (main content) was lost"
        );
    });
}