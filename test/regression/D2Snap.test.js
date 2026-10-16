import { JSDOM } from "jsdom";

import { flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


// Default normalizers, with custom settings for the given ones (in place).
function withNormalizerSettings(settingsByNormalizer) {
    return defaults.NORMALIZERS
        .map(normalizer => {
            const settings = settingsByNormalizer.get(normalizer);

            return settings
                ? (virtualNode, liveNode, context) => normalizer(virtualNode, liveNode, context, settings)
                : normalizer;
        });
}

// Default normalizers, with the given label attribute names for all label-aware normalizers.
function withLabelAttributeNames(labelAttributeNames) {
    return withNormalizerSettings(new Map([
        defaults.normalizers.filterEmptyImages,
        defaults.normalizers.normalizeSvgsToImgs,
        defaults.normalizers.normalizeIconClassesToImgs,
        defaults.normalizers.normalizeTextLabelAttributesToContent
    ].map(normalizer => [ normalizer, { labelAttributeNames } ])));
}

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
    const html = `
        <html>
            <body>
                <section>
                    <p>
                        visit <ns:widget>KEPTCONTENT</ns:widget> for help
                    </p>
                </section>
            </body>
        </html>
    `;
    const snapshot = await d2Snap(html, 0.9, 0.9, 0.9);

    assertIn(
        "KEPTCONTENT",
        snapshot.html,
        "Namespace-qualified element content was stripped (false positive in scheme regex)"
    );

});

// ---------------------------------------------------------------------------
// Root cause of the futurumshop collapse: void elements (<br>, <img>, ...) are
// not listed in the UI feature heuristics, so the "custom element is a container"
// heuristic classifies them as containers — and with a high container fallbackRating
// they outrank their parent. A top-down merge then moves the parent's children
// INTO the void element, which serializes without children, silently destroying
// everything around it.
// ---------------------------------------------------------------------------
await test("Container merge never moves content into a void element", async () => {
    for(const voidTag of [ "br", "img", "hr", "wbr" ]) {
        const html = `
            <html>
                <body>
                    <div id="d">
                        <${voidTag}>
                        <p>
                            IMPORTANT CONTENT one two three four five.
                        </p>
                    </div>
                </body>
            </html>
        `;
        const snapshot = await d2Snap(html, 0.9, 0.9, 0.9, {
            debug: true
        });

        assertIn("IMPORTANT CONTENT", snapshot.html, `Content was merged into void <${voidTag}> and lost`);
    }
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
    // UI-feature heuristics: body and section both containers, div (low) rating < section (high) rating
    // → top-down merge is triggered for section, copying div's attrs to section.
    for(const [ name, val ] of [
        [ "@click", "doIt()" ],
        [ "*ngIf", "show" ],
        [ ":href", "/path" ]
    ]) {
        // Place the framework attribute on the low-rating div (= sourceElement in top-down merge),
        // which forces setAttribute() to be called with it.
        const html = `
            <html>
                <body>
                    <div ${name}="${val}">
                        <section>
                            <p>
                                IMPORTANT content
                            </p>
                        </section>
                    </div>
                </body>
            </html>
        `;
        const snapshot = await d2Snap(html, 1.0, 1.0, 1.0);

        assertIn(
            "IMPORTANT content",
            snapshot.html,
            `Content lost when merging element carrying framework attr ${name}`
        );
    }
});

// ---------------------------------------------------------------------------
// Regression: Turndown's gfm plugin passes <table> elements without a <thead>
// through as raw HTML. The textFormatting pass returned the markdown fragment
// for re-traversal so nested elements like <em> inside a kept <button> get converted;
// but a passed-through <table> re-parsed into another <table>, which fed itself
// back into Turndown forever. Real-world reproducer: futurumshop product page
// (>1MB HTML with <table class="product-description-table"> and no <thead>).
// Asserts termination via a hard wall-clock budget — if the loop is reintroduced,
// this hangs and the test runner times out.
// ---------------------------------------------------------------------------
await test("Markdown pass terminates on Turndown HTML passthrough (table without <thead>)", async () => {
    const html = `
        <html>
            <body>
                <table class="product-description-table">
                    <tbody>
                        <tr>
                            <td>Ademend vermogen:</td>
                            <td>5/5</td>
                        </tr>
                        <tr>
                            <td>Gewicht:</td>
                            <td>150g</td>
                        </tr>
                    </tbody>
                </table>
            </body>
        </html>
    `;

    const start = Date.now();
    const snapshot = await d2Snap(html, 0.5, 0.5, 0.5, {
        debug: true
    });
    const elapsedMs = Date.now() - start;

    assertLess(elapsedMs, 2000, `Markdown pass took ${elapsedMs}ms — infinite-loop regression?`);
    assertIn("Ademend vermogen", snapshot.html, "Table content was lost");
});

// ---------------------------------------------------------------------------
// Regression guard for the OTHER side of the fix: the textFormatting pass MUST
// still re-traverse markdown-replacement fragments so that nested textFormatting
// elements (e.g. <em>) inside a kept actionable (e.g. <button>) get converted.
// Without re-traversal, <em> would survive as raw HTML instead of being rendered as _i_.
// ---------------------------------------------------------------------------
await test("Markdown pass converts nested textFormatting inside kept actionable (<em> in <button>)", async () => {
    const html = `
        <html>
            <body>
                <li>
                    Info <button onclick="x()"><em>i</em></button>
                </li>
            </body>
        </html>
    `;
    const snapshot = await d2Snap(html, 0.3, 0.3, 0.3, {
        debug: true
    });

    assertIn("_i_", snapshot.html, "<em> inside kept <button> was not converted to markdown");
    assertNotIn("<em>", snapshot.html, "Raw <em> leaked through textFormatting pass");
});

// ---------------------------------------------------------------------------
// A URL wrapped in angle brackets — a markdown autolink, or markdown's pointy-bracket
// destination syntax that Turndown emits for URLs CONTAINING SPACES (`<https://host/a b c.svg>`)
// — re-parses via createContextualFragment into a bogus `<https:>` element
// (path/space segments become attributes). That element then acts as a container
// (fallbackRating 1.0) and swallows its siblings, renaming a real section to
// `<https:>`. Seen on the futurumshop page: `<https: fonl="" futurum="" ...>`.
// ---------------------------------------------------------------------------
await test("Markdown autolink URL does not become a bogus container element", async () => {
	const findColonTags = root => [ ...root.querySelectorAll("*") ]
		.map(el => el.tagName)
		.filter(tagName => tagName.includes(":"));

	for(const url of [
        "https://example.com",
        "https://assets.example.com/a/FUTURUM Icon 19 UV.svg",
        "mailto:x@y.com"
    ]) {
		const html = `
            <html>
                <body>
                    <main>
                        <p>
                            See &lt;${url}&gt; here
                        </p>
                    </main>
                </body>
            </html>
        `;
		const snapshot = await d2Snap(html, 0, 0, 0, {
			sentenceRanker: null
		});

		// Canary: the <p> must have gone through Turndown, otherwise nothing below is exercised
		assertNotIn("<p", snapshot.html, `Markdown pass did not run for <${url}>`);

		const colonTags = findColonTags(snapshot.dom);
		if(colonTags.length) {
			throw new Error(`URL <${url}> re-parsed into bogus element(s): ${colonTags.join(", ")}`);
		}
	}

	// Unwrapping the bogus `<scheme:>` elements must NOT disturb a kept
	// actionable (`<a …>`) nested inside it. The autolink must be closed,
	// otherwise the parser eats the anchor as attributes and there is no anchor.
	const linkHTML = `
        <html>
            <body>
                <main>
                    <p>
                        visit &lt;https://example.com&gt; follow <a href="https://kept.example/x">KEPTLINK</a> now
                    </p>
                </main>
            </body>
        </html>
    `;
	const linkSnapshot = await d2Snap(linkHTML, 0, 0, 0, {
		sentenceRanker: null
	});

	assertNotIn("<p", linkSnapshot.html, "Markdown pass did not run for kept-anchor case");

	const colonTags = findColonTags(linkSnapshot.dom);
	if(colonTags.length) {
		throw new Error(`Autolink re-parsed into bogus element(s): ${colonTags.join(", ")}`);
	}

	const anchor = linkSnapshot.dom.querySelector(`a[href="https://kept.example/x"]`);
	if(!anchor || anchor.textContent !== "KEPTLINK") {
		throw new Error("Kept anchor was lost or corrupted by autolink unwrapping");
	}
});

await test("Keep aria-labelledby descriptor of empty actionable element", async () => {
    const html = `
        <div class="ot-accordion-layout">
            <button aria-expanded="false" aria-controls="ot-desc-id-5" aria-labelledby="ot-header-id-5"></button>
            <div class="ot-acc-hdr">
                <h4 class="ot-cat-header" id="ot-header-id-5">Social Media Cookies</h4>
            </div>
            <p id="ot-desc-id-5">
                Social Media cookies are set by a range of social media services.
            </p>
        </div>
    `;

    for(const r of [ 0.1, 0.5, 0.9, 1.0 ]) {
        const snapshot = await d2Snap(html, r, r, r, {
            debug: true
        });
        const buttonText = (snapshot.dom.querySelector("button")?.textContent ?? "").trim();

        assertEqual(
            buttonText,
            "Social Media Cookies",
            `Actionable element lost its aria-labelledby descriptor at r=${r}`
        );
    }
});

await test("Normalize text label for non-raw-text content elements only", async () => {
    const html = `
        <div class="row">
            <textarea aria-label="Example"></textarea>
            <iframe title="YouTube player"></iframe>
        </div>
        <div class="row">
            <div role="heading" aria-label="Checkout"></div>
        </div>
    `;

    const snapshot = await d2Snap(html, 0, 1, 1, {
        debug: true,
        filterEmptyElements: false
    });
    const snapshotHTML = flattenDOMSnapshot(snapshot.html);

    assertIn(
        "<textarea></textarea>",
        snapshotHTML,
        `Raw-text element incorrectly normalized (TEXTAREA)`
    );
    assertIn(
        "<iframe></iframe>",
        snapshotHTML,
        `Raw-text element incorrectly normalized (IFRAME)`
    );
    assertIn(
        "<div role=\"heading\">Checkout</div>",
        snapshotHTML,
        `Non-raw-text element incorrectly normalized (DIV)`
    );
});

// ---------------------------------------------------------------------------
// An image without 'alt' and 'src' attributes must not be filtered if text-label
// promotion is enabled.
// ---------------------------------------------------------------------------
await test("Image element without 'alt' and 'src' but label attribute must not be filtered", async () => {
    const html = `
        <div>
            <img title="Activate">
            <img name="Deactivate">
        </div>`;
    const snapshot = await d2Snap(html, 0.9, 0.8, 0.7, {
        debug: true,
        normalizers: withLabelAttributeNames([ "name" ])
    });

    assertIn("![Deactivate]()", snapshot.html, "Image was filtered from snapshot");
});

// ---------------------------------------------------------------------------
// An element with 'aria-labelledby' attribute that is described by an element embedded
// in an SVG must not remain empty-normalized because of SVG-to-IMG normalization.
// ---------------------------------------------------------------------------
await test("Element with 'aria-labelledby' related to SVG and SVG both normalize", async () => {
    const html = `
        <svg><title id="label">Submit</title></svg>
        <button aria-labelledby="label"></button>
    `;
    const snapshot = await d2Snap(html, 0, 1, 0, {
        debug: true,
        normalizers: withLabelAttributeNames([ "aria-labelledby" ])
    });

    assertNotIn("<svg>", snapshot.html, "SVG was preserved");
    assertIn("![Submit]()", snapshot.html, "MD image is missing");
    assertIn("<button>Submit</button>", flattenDOMSnapshot(snapshot.html), "Button text-label was not normalized");
});

// ---------------------------------------------------------------------------
// Any input is ensured to be wrapped by a BODY element (if is no full document).
// Root node-destructive operations would otherwise be no-ops, so filtering would
// break at the root.
// ---------------------------------------------------------------------------
await test("Filterable root element must not error", async () => {
    const html = `
        <section class="wrapper">
            <strong>Filters</strong>
            <p>
                Remove DOM features before downsampling.
            </p>
        </section>
        <div class="wrapper">
            <strong>Filters</strong>
            <p>
                Remove DOM features before downsampling.
            </p>
        </div>
    `;
    const dom = new JSDOM(html).window;
    const document = dom.document;
    const sectionRoot = dom.document.body.firstChild;

    for(const input of [ html, document, sectionRoot ]) {
        const snapshot = await d2Snap(input, 1, 1, 1, {
            debug: true,
            normalizers: withNormalizerSettings(new Map([
                [ defaults.normalizers.filterNoiseElements, { tagNames: [ "SECTION" ] } ]
            ]))
        });

        assertIn("<body>", snapshot.outerHTML, "Inserted wrapper root element (BODY) was removed");
        assertNotIn("<section>", snapshot.outerHTML, "To-be-filtered root element (SECTION) was not removed");
        assertNotIn("<div>", snapshot.outerHTML, "Not-to-be-filtered root element (DIV) was removed");
    }
});

// ---------------------------------------------------------------------------
// The markdown pass re-parses Turndown output as HTML (createContextualFragment).
// Escaped markup in text (`&lt;img …&gt;`) is unescaped by Turndown; if it were not
// re-escaped, it would re-parse into REAL elements — injecting images, scripts or
// formatting that never existed in the page (and executing handlers in a browser).
// ---------------------------------------------------------------------------
await test("Escaped markup in text never re-parses into elements (markdown pass)", async () => {
    for(const html of [
        `<main><p>Order note: &lt;img src=x onerror=alert(1)&gt; and &lt;script&gt;steal()&lt;/script&gt;</p></main>`,
        `<main><button>Add &lt;b&gt;extra cheese&lt;/b&gt; &lt;img src=x&gt;</button></main>`
    ]) {
        const snapshot = await d2Snap(html, 0, 0, 0, {
            sentenceRanker: null
        });

        assertEqual(snapshot.dom.querySelectorAll("img, script, b").length, 0, `Escaped markup became elements: ${snapshot.html}`);
        assertIn("&lt;img src=x", snapshot.html, "Escaped markup text was lost");
    }
});

// ---------------------------------------------------------------------------
// The live DOM is the agent's page: snapshotting must never mutate it. Normalizers
// operate on a virtual clone and only read the live counterpart (labels, shadow roots).
// Only the opt-in assignUniqueIds normalizer writes (IDs) to the live DOM.
// ---------------------------------------------------------------------------
await test("Snapshot does not mutate the live DOM (except unique IDs)", async () => {
    const html = `
        <main class="menu" data-topic="burgers">
            <!-- order: -->
            <h1>Our Burgers</h1>
            <svg><title>Logo</title></svg>
            <i class="fa fa-bars"></i>
            <button aria-label="Open menu"></button>
            <img src="data:image/png;base64,AA">
            <x-cart></x-cart>
            <script>track();</script>
        </main>
    `;
    const dom = new JSDOM(html).window;
    dom.document.querySelector("x-cart")
        .attachShadow({ mode: "open" })
        .innerHTML = "<button>Checkout</button>";

    const liveHTML = dom.document.documentElement.outerHTML;

    for(const r of [ 0, 0.5, 1 ]) {
        await d2Snap(dom.document, r, r, r, {
            debug: true,
            shadowDOM: true
        });

        assertEqual(dom.document.documentElement.outerHTML, liveHTML, `Live DOM was mutated at r=${r}`);
    }

    await d2Snap(dom.document, 0.5, 0.5, 0.5, {
        uniqueIDs: true
    });

    assertEqual(
        dom.document.documentElement.outerHTML.replace(/ data-uid="\d+"/g, ""),
        liveHTML,
        "Live DOM was mutated beyond unique IDs"
    );
});

// ---------------------------------------------------------------------------
// Snapshots feed agent prompts; identical input must yield identical output
// (no dependence on iteration order of maps/sets, timers, or shared state).
// ---------------------------------------------------------------------------
await test("Snapshot is deterministic", async () => {
    const html = `
        <main>
            <h1>Our Fries</h1>
            <p>Fries are crispy. They are salted. They come with ketchup. Mayonnaise is popular too.</p>
            <button>Add</button>
        </main>
    `;

    for(const r of [ 0, 0.5, 1 ]) {
        const snapshotA = await d2Snap(html, r, r, r);
        const snapshotB = await d2Snap(html, r, r, r);

        assertEqual(snapshotA.html, snapshotB.html, `Snapshot not deterministic at r=${r}`);
    }
});

// ---------------------------------------------------------------------------
// Agents act on unique IDs across turns: IDs of existing elements must survive DOM
// changes between snapshots; new elements get fresh IDs (never reused ones).
// ---------------------------------------------------------------------------
await test("Unique IDs stay stable across DOM changes between snapshots", async () => {
    const dom = new JSDOM(`<main><button>Add</button><button>Remove</button></main>`).window;
    const main = dom.document.querySelector("main");

    const idOf = (snapshot, text) => [ ...snapshot.dom.querySelectorAll("button") ]
        .find(button => button.textContent.trim() === text)
        ?.getAttribute("data-uid");

    const snapshotBefore = await d2Snap(dom.document, 0, 1, 0, {
        uniqueIDs: true
    });

    const checkoutButton = dom.document.createElement("button");
    checkoutButton.textContent = "Checkout";
    main.prepend(checkoutButton);
    main.querySelectorAll("button")[2].remove();    // Remove

    const snapshotAfter = await d2Snap(dom.document, 0, 1, 0, {
        uniqueIDs: true
    });

    assertEqual(idOf(snapshotAfter, "Add"), idOf(snapshotBefore, "Add"), "Existing element changed its unique ID");
    assertTrue(
        ![ idOf(snapshotBefore, "Add"), idOf(snapshotBefore, "Remove") ].includes(idOf(snapshotAfter, "Checkout")),
        "New element reused a unique ID"
    );
});

// ---------------------------------------------------------------------------
// Non-ASCII text (umlauts, CJK, emoji, combining characters) must survive
// tokenization, ranking and markdown conversion byte-identically.
// ---------------------------------------------------------------------------
await test("Unicode and emoji text is preserved", async () => {
    const html = `<main><h1>Döner 🌯 – 寿司 – Ñandú</h1><button>Bestellen ✓</button></main>`;

    for(const r of [ 0, 0.5, 1 ]) {
        const snapshot = await d2Snap(html, r, r, r);

        assertIn("Döner 🌯 – 寿司 – Ñandú", snapshot.html, `Unicode heading text was altered at r=${r}`);
        assertIn("Bestellen ✓", snapshot.html, `Unicode actionable text was altered at r=${r}`);
    }
});

// ---------------------------------------------------------------------------
// Malformed accessibility references are common in the wild: self-references,
// reference cycles, missing targets, and duplicate IDs. Label resolution must
// terminate and resolve deterministically (first element with the ID wins).
// ---------------------------------------------------------------------------
await test("Malformed aria-labelledby references terminate and resolve deterministically", async () => {
    const html = `
        <main>
            <button id="self" aria-labelledby="self"></button>
            <button aria-labelledby="fries"></button>
            <span id="fries" aria-labelledby="ketchup">Fries</span>
            <span id="ketchup" aria-labelledby="fries">Ketchup</span>
            <button aria-labelledby="missing"></button>
            <span id="dup">First</span>
            <span id="dup">Second</span>
            <button class="dup" aria-labelledby="dup"></button>
        </main>
    `;
    const snapshot = await d2Snap(html, 0, 1, 0, {
        debug: true
    });
    const buttonTexts = [ ...snapshot.dom.querySelectorAll("button") ].map(button => button.textContent.trim());

    assertEqual(buttonTexts, [ "", "Fries", "", "First" ], "Unexpected label resolution for malformed references");
});

// ---------------------------------------------------------------------------
// Shadow DOM edge cases: closed shadow roots are inaccessible (light content only,
// no crash); nested open shadow roots compose recursively, including slot fallback
// content when nothing is assigned to a slot.
// ---------------------------------------------------------------------------
await test("Shadow DOM: closed roots, nested roots, and slot fallback content", async () => {
    const dom = new JSDOM(`<main><x-closed><span>Light fries</span></x-closed><x-outer><span slot="title">Your order</span></x-outer></main>`).window;

    dom.document.querySelector("x-closed")
        .attachShadow({ mode: "closed" })
        .innerHTML = "<button>Secret checkout</button><slot></slot>";

    const outerRoot = dom.document.querySelector("x-outer").attachShadow({ mode: "open" });
    outerRoot.innerHTML = `<h2><slot name="title">Cart</slot></h2><x-inner></x-inner>`;
    outerRoot.querySelector("x-inner")
        .attachShadow({ mode: "open" })
        .innerHTML = `<button>Checkout</button><slot>No items yet</slot>`;

    const snapshot = await d2Snap(dom.document, 0, 0.5, 0, {
        debug: true,
        shadowDOM: true
    });

    assertIn("Light fries", snapshot.html, "Light content of closed shadow host was lost");
    assertNotIn("Secret checkout", snapshot.html, "Closed shadow root content leaked");
    assertIn("Your order", snapshot.html, "Slotted content of nested shadow root was lost");
    assertIn("<button>Checkout</button>", flattenDOMSnapshot(snapshot.html), "Nested shadow root was not composed");
    assertIn("No items yet", snapshot.html, "Slot fallback content was lost");
});

// ---------------------------------------------------------------------------
// Downsampling ratios are unit parameters. Invalid values (NaN, out of range,
// numeric strings) must fail fast with a RangeError rather than silently
// producing a garbage snapshot.
// ---------------------------------------------------------------------------
await test("Invalid downsampling ratios are rejected", async () => {
    for(const [ rE, rA, rT ] of [
        [ NaN, 0.5, 0.5 ],
        [ 0.5, -0.1, 0.5 ],
        [ 0.5, 0.5, 1.1 ],
        [ "0.5", 0.5, 0.5 ]
    ]) {
        let snapshotErr;
        try {
            await d2Snap("<p>Fries</p>", rE, rA, rT);
        } catch(err) {
            snapshotErr = err;
        }

        assertTrue(snapshotErr instanceof RangeError, `No RangeError for ratios (${rE}, ${rA}, ${rT})`);
    }
});

// ---------------------------------------------------------------------------
// The uniqueIDs shortcut appends a normalizer to the effective list. It must never
// push into NORMALIZERS (shared, frozen) or into a caller-provided list —
// otherwise unique IDs would leak into all later snapshots.
// ---------------------------------------------------------------------------
await test("Unique IDs shortcut never mutates default or caller-provided normalizer lists", async () => {
    const defaultNormalizers = [ ...defaults.NORMALIZERS ];
    const customNormalizers = [ defaults.normalizers.filterComments ];

    await d2Snap("<main><button>Add</button></main>", 0.5, 0.5, 0.5, {
        uniqueIDs: true
    });
    await d2Snap("<main><button>Add</button></main>", 0.5, 0.5, 0.5, {
        uniqueIDs: true,
        normalizers: customNormalizers
    });

    assertEqual(defaults.NORMALIZERS.length, defaultNormalizers.length, "Default normalizers were mutated");
    assertEqual(customNormalizers.length, 1, "Caller-provided normalizers were mutated");

    const snapshot = await d2Snap("<main><button>Add</button></main>", 0.5, 0.5, 0.5);

    assertNotIn("data-uid", snapshot.html, "Unique IDs leaked into a later snapshot");
});

// ---------------------------------------------------------------------------
// Custom callbacks are user code: a sentence ranker may return nothing or sentences
// that are not in the text, and a normalizer may replace elements with text nodes.
// Neither may crash the snapshot. A throwing normalizer must surface its error
// (never be swallowed into a silently incomplete snapshot).
// ---------------------------------------------------------------------------
await test("Custom callbacks: degenerate results do not crash, errors surface", async () => {
    const textHTML = `<p>Pizza is round. Fries are long. Tacos are folded. Sushi is rolled.</p>`;

    for(const sentenceRanker of [ () => [], () => [ "Not in the text." ] ]) {
        const snapshot = await d2Snap(textHTML, 0, 0, 0.5, {
            sentenceRanker
        });

        assertTrue(typeof snapshot.html === "string", "Degenerate sentence ranker crashed the snapshot");
    }

    const replacedSnapshot = await d2Snap(`<main><section><h2>Fries</h2></section><section><h2>Ketchup</h2></section></main>`, 0, 1, 0, {
        normalizers: [
            virtualNode => {
                if(virtualNode.nodeType !== 1 || virtualNode.tagName !== "SECTION") return;

                virtualNode.replaceWith(virtualNode.ownerDocument.createTextNode(`[${virtualNode.textContent.trim()}]`));
            }
        ]
    });

    assertIn("[Fries][Ketchup]", flattenDOMSnapshot(replacedSnapshot.html), "Element-to-text replacement was not applied");

    let snapshotErr;
    try {
        await d2Snap("<p>Fries</p>", 0, 0, 0, {
            normalizers: [ () => { throw new Error("Normalizer failed"); } ]
        });
    } catch(err) {
        snapshotErr = err;
    }

    assertEqual(snapshotErr?.message, "Normalizer failed", "Normalizer error was swallowed");
});

// ---------------------------------------------------------------------------
// Input edge cases: Buffer input, detached elements, document-level content outside
// BODY (HEAD), and input without any element content.
// ---------------------------------------------------------------------------
await test("Input edge cases: Buffer, detached element, HEAD content, empty content", async () => {
    const bufferSnapshot = await d2Snap(Buffer.from("<main><button>Add</button></main>"), 0, 0, 0);

    assertIn("<button>Add</button>", flattenDOMSnapshot(bufferSnapshot.html), "Buffer input was not snapshotted");

    const detachedElement = new JSDOM("").window.document.createElement("section");
    detachedElement.innerHTML = "<button>Add</button><p>Fries</p>";
    const detachedSnapshot = await d2Snap(detachedElement, 0, 0, 0);

    assertIn("<button>Add</button>", flattenDOMSnapshot(detachedSnapshot.html), "Detached element input was not snapshotted");

    const headSnapshot = await d2Snap(`<html><head><title>Burger Bar</title><style>main{}</style></head><body><main>Fries</main></body></html>`, 0, 0, 0);

    assertNotIn("Burger Bar", headSnapshot.outerHTML, "HEAD content leaked into the snapshot");

    for(const html of [ "   \n  ", "<!-- only a comment -->" ]) {
        const emptySnapshot = await d2Snap(html, 0.5, 0.5, 0.5);

        assertEqual(emptySnapshot.html, "", `Non-empty snapshot for content-less input ${JSON.stringify(html)}`);
    }
});

// ---------------------------------------------------------------------------
// Attribute names are case-sensitive on non-HTML elements: getAttribute("ARIA-LABEL")
// finds `aria-label` on an HTML element, but not on an SVG element. Configured label
// attribute names (often written in upper case) must still resolve on SVGs.
// ---------------------------------------------------------------------------
await test("Upper case label attribute names resolve on SVG elements", async () => {
    const html = `
        <main>
            <span id="cart-label">Cart</span>
            <svg aria-labelledby="cart-label"></svg>
            <svg aria-label="Menu"></svg>
        </main>
    `;
    const snapshot = await d2Snap(html, 0, 1, 0, {
        normalizers: withLabelAttributeNames([ "ARIA-LABELLEDBY", "ARIA-LABEL" ])
    });

    assertIn("![Cart]()", snapshot.html, "SVG label reference (ARIA-LABELLEDBY) was not resolved");
    assertIn("![Menu]()", snapshot.html, "SVG label (ARIA-LABEL) was not resolved");
});

// ---------------------------------------------------------------------------
// Normalization order within an element: attributes are normalized BEFORE the element.
// Otherwise, filterEmptyImages would see a data-URL `src` that filterDataUrls strips
// only afterwards — leaving an empty `<img>` in the snapshot.
// ---------------------------------------------------------------------------
await test("Data-URL-only image is removed with default normalizers", async () => {
    const html = `
        <main>
            <img src="data:image/png;base64,AA">
            <img src="data:image/png;base64,AA" alt="Bread">
            <p>Hotdog</p>
        </main>
    `;
    const snapshot = await d2Snap(html, 0, 1, 0, {
        markdown: false
    });

    assertEqual(snapshot.dom.querySelectorAll("img").length, 1, "Data-URL-only image was not removed");
    assertNotIn("data:image", snapshot.html, "Data URL was not filtered");
});

// ---------------------------------------------------------------------------
// Size metadata must measure the input on the same root as the snapshot: BODY
// contents for documents, the element itself for element input (wrapped in a BODY
// by snapshots). Regression: element input was measured without its own tag (and
// HTML elements incl. HEAD), so an unchanged input reported up to 194 %. Sizes are
// UTF-8 bytes (string length counts UTF-16 code units).
// ---------------------------------------------------------------------------
await test("Size metadata measures the same root as the snapshot, in UTF-8 bytes", async () => {
    const html = `<section class="card"><h2>Döner 🌯</h2><button>Add</button></section>`;
    // No reduction at all: unchanged input
    const options = {
        filterEmptyElements: false,
        minify: false,
        normalizers: [],
        sentenceRanker: sentences => sentences,
        markdown: false
    };

    const document = new JSDOM(`<html><head><title>Kebab</title></head><body>${html}</body></html>`).window.document;

    for(const [ label, input ] of [
        [ "string", html ],
        [ "document", document ],
        [ "HTML element", document.documentElement ],
        [ "element", document.querySelector("section") ]
    ]) {
        const snapshot = await d2Snap(input, 0, 0, 0, options);

        assertEqual(snapshot.html, html, `Snapshot not unchanged (${label})`);
        assertEqual(snapshot.meta.sizeRatio, 1, `Invalid size ratio for unchanged input (${label})`);
        assertEqual(snapshot.meta.originalSize, new TextEncoder().encode(html).length, `Invalid original size (${label}; UTF-8 bytes)`);
    }
});

// ---------------------------------------------------------------------------
// Whitespace inside PRE is content. Minification and debug formatting must leave it
// as is: formatting PRE content onto a new line made the HTML parser drop that line
// break again (HTML spec), so a snapshot fed back as input measured 1 byte less than
// its own serialization. Minification collapsed PRE whitespace.
// ---------------------------------------------------------------------------
await test("Preformatted whitespace survives minification and formatting (no size drift)", async () => {
    const html = `<main><h2>Order</h2><pre>  extra
   ketchup  </pre><p>Fries</p></main>`;
    const options = {
        debug: true,
        filterEmptyElements: false,
        normalizers: [],
        sentenceRanker: sentences => sentences,
        markdown: false
    };

    // Snapshot notation without reduction, fed back as input
    const normalizedHTML = (await d2Snap(html, 0, 0, 0, options)).html;
    const snapshot = await d2Snap(normalizedHTML, 0, 0, 0, {
        ...options,
        minify: false
    });

    assertNotIn("<pre>\n", normalizedHTML, "PRE content was formatted onto a new line");
    assertEqual(snapshot.html, normalizedHTML, "Snapshot of snapshot notation changed");
    assertEqual(snapshot.meta.snapshotSize, snapshot.meta.originalSize, "Size drift between input and output notation");
});

// ---------------------------------------------------------------------------
// Debug formatting must not change the rendered text. Regression: the formatter's
// tokenizer dropped whitespace-only text, so a space between two inline elements
// (e.g., adjacent links) disappeared – "Gmail Images" became "GmailImages".
// ---------------------------------------------------------------------------
await test("Debug formatting keeps spaces between inline elements", async () => {
    const html = `<nav class="menu"><a href="/burgers">Burgers</a>   <a href="/fries">Fries</a> <b>Hot</b> <i>Dogs</i></nav>`;
    const options = {
        filterEmptyElements: false,
        normalizers: [],
        sentenceRanker: null,
        markdown: false
    };

    const snapshot = await d2Snap(html, 0, 0, 0, options);
    const debugSnapshot = await d2Snap(html, 0, 0, 0, {
        ...options,
        debug: true
    });

    assertEqual(
        debugSnapshot.dom.textContent.replace(/\s+/g, " ").trim(),
        snapshot.dom.textContent.replace(/\s+/g, " ").trim(),
        "Debug formatting changed the rendered text"
    );
    assertIn("Burgers</a> <a", debugSnapshot.html, "Space between inline elements dropped");
});

// ---------------------------------------------------------------------------
// Property access on a jsdom document runs a named-property lookup that walks
// the whole document whenever an element that can carry a name (img, form,
// iframe, …) was inserted or removed since. Snapshots alternate DOM mutations
// and document accesses, so per-element accesses made snapshots quadratic in
// the page size (2 MB page: 46 s instead of 13 s). Guarded via call counts on
// the window's prototypes (shared by the snapshot's internal document), which
// is deterministic, unlike timing ratios.
// ---------------------------------------------------------------------------
function createGuardPage(blockCount) {
    return "<main>" + Array.from({ length: blockCount }, (_, i) => `
        <section class="card">
            <p>Burger ${i} <img src="b${i}.png" alt="Burger ${i}"> with <b>fries</b>.</p>
            <span class="fa fa-cart"></span>
            <button>Add</button>
        </section>`).join("") + "</main>";
}

async function countCalls(blockCount, prototypeName, methodName) {
    const { window } = new JSDOM(createGuardPage(blockCount));
    const prototype = window[prototypeName].prototype;
    const method = prototype[methodName];
    let calls = 0;

    prototype[methodName] = function(...args) {
        calls++;

        return method.apply(this, args);
    };

    try {
        await d2Snap(window.document, 0.5, 0.5, 0.5, {
            normalizers: defaults.NORMALIZERS.map(normalizer => (normalizer === defaults.normalizers.normalizeIconClassesToImgs)
                ? (virtualNode, liveNode, context) => normalizer(virtualNode, liveNode, context, { iconClassPrefixes: [ "fa" ] })
                : normalizer)
        });
    } finally {
        prototype[methodName] = method;
        window.close();
    }

    return calls;
}

await test("Markdown pass creates one range per snapshot", async () => {
    const calls = await countCalls(200, "Document", "createRange");

    assertTrue(calls <= 1, `Ranges created per text element (${calls} for 200 blocks)`);
});

await test("Selector queries do not grow with the page", async () => {
    for(const prototypeName of [ "Element", "Document" ]) {
        const callsSmall = await countCalls(50, prototypeName, "querySelectorAll");
        const callsLarge = await countCalls(200, prototypeName, "querySelectorAll");

        assertTrue(
            callsLarge === callsSmall,
            `${prototypeName}.querySelectorAll calls grow with the page (${callsSmall} for 50 blocks, ${callsLarge} for 200 blocks)`
        );
    }
});

// ---------------------------------------------------------------------------
// Text was downsampled per text node, but child elements (links, emphasis, …)
// split prose into many text nodes, each keeping at least one sentence (or
// fragment): at rT = 1, a Wikipedia paragraph kept 68 % of its text, mostly as
// sentence fragments. With the prose option, the direct text nodes of an
// element form one text (ranked across child elements), keeping complete
// sentences; elements of dropped sentences are removed (except actionables,
// whose sentences rank first).
// ---------------------------------------------------------------------------
await test("Prose with child elements is downsampled as one text (prose option)", async () => {
    const sentences = [
        `The FIR filter output is a dot product, where the <i>h</i>[•] sequence is the impulse response, and <i>K</i> is its length.`,
        `<i>x</i>[•] represents the input sequence being downsampled.`,
        `In a general purpose processor, after computing <i>y</i>[<i>n</i>], the easiest way to compute <i>y</i>[<i>n</i>+1] is to advance the starting index in the <i>x</i>[•] array by <i>M</i>, and recompute the dot product.`,
        `In the case <i>M</i>=2, <i>h</i>[•] can be designed as a <a href="/wiki/Half-band_filter">half-band filter</a>, where almost half of the coefficients are zero.`,
        `Impulse response coefficients taken at intervals of <i>M</i> form a subsequence, and there are <i>M</i> such subsequences multiplexed together.`,
        `The dot product is the sum of the dot products of each subsequence with the corresponding samples of the <i>x</i>[•] sequence.`,
        `Thus <i>M</i> low-order FIR filters are each filtering one of <i>M</i> multiplexed <i>phases</i> of the input stream.`,
        `In other words, the input stream is demultiplexed and sent through a bank of M filters whose outputs are summed.`,
        `When implemented that way, it is called a <b>polyphase</b> filter.`
    ];
    const html = `<main><section><p>${sentences.join(" ")}</p></section></main>`;
    const plainSentences = sentences.map(sentence => new JSDOM(sentence).window.document.body.textContent);
    const textOf = dom => dom.textContent.replace(/\s+/g, " ").trim();

    const options = { prose: true, markdown: false };
    const fullText = textOf((await d2Snap(html, 0, 0, 0, options)).dom);
    const snapshot = await d2Snap(html, 0, 0, 1, options);
    const keptText = textOf(snapshot.dom);

    assertLess(keptText.length / fullText.length, 0.15, `Text not downsampled (${Math.round(100 * keptText.length / fullText.length)} % kept at rT = 1)`);
    assertTrue(
        plainSentences.some(sentence => keptText.includes(sentence)),
        `Kept text is no complete input sentence: ${keptText}`
    );
    assertEqual(snapshot.dom.querySelectorAll("a").length, 1, "Actionable element removed");
});


// ---------------------------------------------------------------------------
// Unique IDs continued from a counter that was initialised from the live
// document only once: an ID the page assigned later (e.g., to an inserted
// element) was handed out again in the next snapshot, violating uniqueness.
// Candidates are checked against the IDs present at each snapshot.
// ---------------------------------------------------------------------------
await test("Unique IDs stay unique when the page assigns IDs between snapshots", async () => {
    const { window } = new JSDOM(`<main><button>Add</button></main>`);
    const document = window.document;
    const uniqueIDs = () => [ ...document.querySelectorAll("[data-uid]") ].map(element => element.getAttribute("data-uid"));

    await d2Snap(document, 0, 0, 0, { uniqueIDs: true });
    const firstIDs = uniqueIDs();

    // The page inserts an element with the next ID, and an unlabelled one
    const next = String(Math.max(...firstIDs.map(Number)) + 1);
    document.querySelector("main").insertAdjacentHTML("beforeend", `<button data-uid="${next}">Page</button><button>New</button>`);

    await d2Snap(document, 0, 0, 0, { uniqueIDs: true });
    const secondIDs = uniqueIDs();

    assertEqual(new Set(secondIDs).size, secondIDs.length, `Duplicate unique IDs: ${secondIDs.join(", ")}`);
    assertEqual(secondIDs.slice(0, firstIDs.length), firstIDs, "Unique IDs not stable across snapshots");

    window.close();
});