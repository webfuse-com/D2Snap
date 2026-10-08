import { readTestFile, writeActual, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


// ---------------------------------------------------------------------------
// Downsampling ratio <-> Quality ratio: `quality` -> D2snap `rE = rA = rT = 1 - quality`
// 
// The replaceWithLabel pass is UNCONDITIONAL — it runs before rE/rA/rT pruning
// — so it must yield the same label-preservation guarantee at every quality in
// [0, 1). Tests sweep that range to lock the contract in.
// ---------------------------------------------------------------------------

function qualityRatioToDownsamplingRatio(quality) {
    const r = 1 - quality;

    return {
        rE: r,
        rA: r,
        rT: r
    };
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
			skip: {
				textRank: true
			}
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
		skip: {
			textRank: true
		}
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
        <html>
            <body>
                <div class="ot-accordion-layout">
                    <button aria-expanded="false" aria-controls="ot-desc-id-5" aria-labelledby="ot-header-id-5"></button>
                    <div class="ot-acc-hdr">
                        <h4 class="ot-cat-header" id="ot-header-id-5">Social Media Cookies</h4>
                    </div>
                    <p id="ot-desc-id-5">
                        Social Media cookies are set by a range of social media services.
                    </p>
                </div>
            </body>
        </html>
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
        <html>
            <body>
                <div class="row">
                    <textarea aria-label="Example"></textarea>
                    <iframe title="YouTube player"></iframe>
                </div>
                <div class="row">
                    <div role="heading" aria-label="Checkout"></div>
                </div>
            </body>
        </html>
    `;

    const snapshot = await d2Snap(html, 0, 1, 1, {
        debug: true,
        filter: {
            emptyElements: false
        }
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
        `Raw-text element incorrectly normalized (TEXTAREA)`
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
    const html = `<div><img title="Activate"><img name="Deactivate"></div>`;
    const snapshot = await d2Snap(html, 0.9, 0.8, 0.7, {
        debug: true,
        normalize: {
            labelsFromAttributes: [ "name" ],
        }
    });

    assertIn("![Deactivate]()", snapshot.html, "Image was filtered from snapshot");
});

// ---------------------------------------------------------------------------
// End-to-end regression guard on the full, real-world news homepage (cnn.com; >2MB).
// ---------------------------------------------------------------------------
for(const quality of [ 0, 0.3, 0.6, 0.9, 1 ]) {
    const cnnHTML = await readTestFile("_regression/edition.cnn.com");  // huge file

    await test(`Snapshot huge page without crash or collapse (q=${quality})`, async () => {
        const { rE, rA, rT } = qualityRatioToDownsamplingRatio(quality);

        const start = Date.now();
        const snapshot = await d2Snap(cnnHTML, rE, rA, rT, {
            debug: true
        });
        const elapsedMs = Date.now() - start;

        await writeActual(`_regression/edition.cnn.com.q=${quality}`, snapshot.html);

        assertLess(elapsedMs, 10000, `Snapshot took ${elapsedMs}ms — re-traversal blow-up regression?`);
        assertIn(
            "The Assignment with Audie Cornish",
            snapshot.html,
            "Actionable content was lost"
        );

        if(quality > 0) {
            assertMore(
                snapshot.html.length,
                2**15,
                `Snapshot collapsed to ${snapshot.html.length} bytes (< ~32K B) — content was destroyed`
            );
        }
    });
}