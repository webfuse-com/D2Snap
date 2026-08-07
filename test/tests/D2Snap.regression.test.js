import { readTestFile, writeActual, qualityRatioToDownsamplingRatio } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const FUTURUM_HTML = await readTestFile("futurum/futurum");


// ---------------------------------------------------------------------------
// End-to-end regression guard on the full, real-world futurumshop product
// page (~1MB). Three regressions converge on this single fixture:
//
//   1. Void-element merge — <br>/<img> etc. classified as containers get
//      content merged into them and dropped on serialization. This is what
//      cratered the survey: q<=0.8 snapshots fell from ~150KB to ~2KB. It only
//      surfaces with a UI feature heuristics where `span` is `textFormatting` (so the
//      surrounding spans are non-containers), which is why we use one here.
//   2. Markdown re-traversal — commit 034a010 fed Turndown's own output back
//      through the textFormatting pass, spinning on passthrough HTML (the
//      infinite loop / mem leak fixed in 71aee90).
//   3. setAttribute crash — the top-down merge copies a child's attributes
//      onto its parent via setAttribute(). Framework attribute names that fail
//      the DOM Name production (Vue's `@click`) throw InvalidCharacterError and
//      abort the snapshot. This page has `@click="autoCloseProfile($event)"`.
//
// The GT below mirrors the deployed UI feature heuristics (span as textFormatting,
// svg as replaceWithLabel, container fallbackRating 1.0) so this fixture exercises
// the real-world collapse path.
// ---------------------------------------------------------------------------
for(const quality of [ 0.1, 0.5, 0.9 ]) {
    await test(`Snapshot full futurumshop product page without crash or collapse (q=${quality})`, async () => {
        const { rE, rA, rT } = qualityRatioToDownsamplingRatio(quality);

        const start = Date.now();
        const snapshot = await d2Snap(FUTURUM_HTML, rE, rA, rT, {
            debug: true
        });
        const elapsedMs = Date.now() - start;

        await writeActual(`futurum/futurum.q=${quality}`, snapshot.html);

        assertLess(elapsedMs, 10000, `Snapshot took ${elapsedMs}ms — re-traversal blow-up regression?`);
        // The collapse sheared this >1MB page down to ~1.8KB at aggressive quality
        // (the survey showed q=0.1 at 1,766 bytes instead of ~150KB).
        // A healthy snapshot must stay above 100KB even at the most aggressive q=0.1.
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
    const html = `<html><body><section><p>visit <ns:widget>KEPTCONTENT</ns:widget> for help</p></section></body></html>`;
    const snapshot = await d2Snap(html, 0.9, 0.9, 0.9);
    assertIn("KEPTCONTENT", snapshot.html,
        "Namespace-qualified element content was stripped (false positive in scheme regex)");
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
    for(const [ name, val ] of [ [ "@click", "doIt()" ], [ "*ngIf", "show" ], [ ":href", "/path" ] ]) {
        // Place the framework attribute on the low-rating div (= sourceElement in top-down merge),
        // which forces setAttribute() to be called with it.
        const html = `<html><body><div ${name}="${val}"><section><p>IMPORTANT content</p></section></div></body></html>`;
        const snapshot = await d2Snap(html, 1.0, 1.0, 1.0);

        assertIn("IMPORTANT content", snapshot.html, `Content lost when merging element carrying framework attr ${name}`);
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
    const html = `<html><body><table class="product-description-table">
        <tbody>
            <tr><td>Ademend vermogen:</td><td>5/5</td></tr>
            <tr><td>Gewicht:</td><td>150g</td></tr>
        </tbody>
    </table></body></html>`;

    const start = Date.now();
    const snapshot = await d2Snap(html, 0.5, 0.5, 0.5, { debug: true });
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
    const html = `<html><body><li>Info <button onclick="x()"><em>i</em></button></li></body></html>`;
    const snapshot = await d2Snap(html, 0.3, 0.3, 0.3, { debug: true });

    assertIn("_i_", snapshot.html, "<em> inside kept <button> was not converted to markdown");
    assertNotIn("<em>", snapshot.html, "Raw <em> leaked through textFormatting pass");
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
        const html = `<html><body><div id="d"><${voidTag}><p>IMPORTANT CONTENT one two three four five.</p></div></body></html>`;
        const snapshot = await d2Snap(html, 0.9, 0.9, 0.9, {
            debug: true
        });

        assertIn("IMPORTANT CONTENT", snapshot.html, `Content was merged into void <${voidTag}> and lost`);
    }
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
    for(const url of [ "https://example.com", "https://assets.example.com/a/FUTURUM Icon 19 UV.svg", "mailto:x@y.com" ]) {
        const html = `<html><body><main><section><p>before</p><p>See &lt;${url}&gt; here</p></section><section><p>IMPORTANT trailing content one two three.</p></section></main></body></html>`;
        const snapshot = await d2Snap(html, 0.9, 0.9, 0.9, {
            attributeScoringFallback: 1,
            debug: true
        });

        assertNotIn("<https:", snapshot.html, `URL <${url}> re-parsed into a bogus <https:> element`);
        assertNotIn("<mailto:", snapshot.html, `URL <${url}> re-parsed into a bogus <mailto:> element`);
        assertIn("IMPORTANT trailing content", snapshot.html, `Content swallowed by bogus element from <${url}>`);
    }

    // Unwrapping the bogus `<scheme:>` elements must NOT disturb a kept
    // actionable (`<a …>`) sitting alongside the autolink in the same markdown.
    const linkHTML = `<html><body><main><p>visit &lt;https://example.com follow <a href="https://kept.example/x">KEPTLINK</a> now</p></main></body></html>`;
    const linkSnapshot = await d2Snap(linkHTML, 0.9, 0.9, 0.9, {
        attributeScoring: {
            href: 1
        },
        debug: true
    });

    assertIn(`href="https://kept.example/x"`, linkSnapshot.html, "Kept anchor's href was corrupted by autolink stripping");
    assertIn("KEPTLINK", linkSnapshot.html, "Kept anchor text was lost");
});