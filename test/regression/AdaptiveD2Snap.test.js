import { JSDOM } from "jsdom";

import { adaptiveD2Snap, d2Snap, defaults } from "../../dist.lib/api.js";


const HTML = `
<main class="page" id="menu" data-track="main-view">
    <!-- Seasonal menu -->
    <header class="header">
        <div class="wrapper">
            <div class="inner">
                <h1>Burger Bar</h1>
                <a href="/order" class="cta" title="Order online">
                    Order now
                </a>
            </div>
        </div>
    </header>
    <section class="intro">
        <div class="container">
            <p>
                Our burgers are made from fresh beef. Every patty is grilled
                over an open flame. The buns are baked daily in our own bakery.
                We also serve vegetarian options.
            </p>
            <ul class="list">
                <li>
                    <strong>Cheeseburger</strong> with <em>cheddar</em>
                </li>
                <li>
                    <strong>Veggie Burger</strong> with grilled halloumi
                </li>
            </ul>
        </div>
    </section>
    <section class="gallery">
        <img src="/img/burger.jpg" alt="Cheeseburger">

        <svg viewBox="0 0 24 24">
            <title>Cart</title>
            <path d="M0 0h24v24H0z"></path>
        </svg>
    </section>
    <form class="order-form" action="/submit">
        <div class="field">
            <label for="size">Size</label>
            <select id="size" name="size">
                <option value="m">Medium</option>
                <option value="l">Large</option>
            </select>
        </div>
        <button
            type="submit"
            aria-label="Place order"
            class="btn"
        ></button>
    </form>
</main>
`;

const tokensAt = async r => (await d2Snap(HTML, r, r, r)).meta.tokenEstimate;
const UNREDUCED = await tokensAt(0);
const MINIMAL = await tokensAt(1);


async function adaptiveError(fn) {
    try {
        await fn();
    } catch(err) {
        return err;
    }

    return null;
}


await test("Adaptive snapshot (unreduced within limit)", async () => {
    const snapshot = await adaptiveD2Snap(HTML, UNREDUCED);

    assertEqual(snapshot.adaptiveIterations, 0, "Invalid adaptive iterations");
    assertEqual(snapshot.parameters, { rE: 0, rA: 0, rT: 0 }, "Invalid parameters");
    assertEqual(snapshot.html, (await d2Snap(HTML, 0, 0, 0)).html, "Invalid snapshot");
});

await test("Adaptive snapshot (impossible limit)", async () => {
    const err = await adaptiveError(() => adaptiveD2Snap(HTML, MINIMAL - 1));

    assertTrue(err instanceof RangeError, "No range error for an impossible limit");
    assertTrue(err.message.includes(`last estimate: ${MINIMAL}`), `Most reduced snapshot not checked: ${err.message}`);
    assertEqual(err.meta, { lastEstimate: MINIMAL }, "Invalid error meta (last estimate)");
});

await test("Adaptive snapshot (close to the limit, equivalent to d2Snap)", async () => {
    for(const share of [ 0.25, 0.5, 0.75 ]) {
        const maxTokens = Math.round(MINIMAL + (UNREDUCED - MINIMAL) * share);
        const snapshot = await adaptiveD2Snap(HTML, maxTokens);
        const { rE, rA, rT } = snapshot.parameters;

        assertTrue(snapshot.meta.tokenEstimate <= maxTokens, `Limit exceeded (${snapshot.meta.tokenEstimate} > ${maxTokens})`);
        assertTrue(snapshot.meta.tokenEstimate >= 0.75 * maxTokens, `Not close to the limit (${snapshot.meta.tokenEstimate} for ${maxTokens})`);
        assertTrue(rE === rA && rA === rT, "Invalid parameters (r = rE = rA = rT)");

        const direct = await d2Snap(HTML, rE, rA, rT);

        assertEqual(snapshot.html, direct.html, `Not equivalent to d2Snap (r = ${rE})`);
        assertEqual(
            [ snapshot.meta.originalSize, snapshot.meta.snapshotSize, snapshot.meta.sizeRatio ],
            [ direct.meta.originalSize, direct.meta.snapshotSize, direct.meta.sizeRatio ],
            "Invalid size metadata"
        );
    }
});

await test("Adaptive snapshot (pre-processed once)", async () => {
    let calls = 0;
    const countingNormalizers = defaults.NORMALIZERS.map(normalizer => (...args) => {
        calls++;

        return normalizer(...args);
    });

    await d2Snap(HTML, 0, 0, 0, { normalizers: countingNormalizers });
    const callsPerSnapshot = calls;

    calls = 0;
    const snapshot = await adaptiveD2Snap(HTML, Math.round((UNREDUCED + MINIMAL) / 2), 5, { normalizers: countingNormalizers });

    assertTrue(snapshot.adaptiveIterations >= 2, "Search too short to tell");
    assertEqual(calls, callsPerSnapshot, `Normalizers ran per snapshot (${calls} calls; ${callsPerSnapshot} per snapshot)`);
});

await test("Adaptive snapshot (no reiteration on a plateau)", async () => {
    // Snapshots between 140 and 168 tokens leave the bracket unchanged
    const snapshot = await adaptiveD2Snap(HTML, 160, 5);
    const { rE, rA, rT } = snapshot.parameters;

    assertTrue(snapshot.adaptiveIterations < 5, `Reiterated on a plateau (${snapshot.adaptiveIterations} iterations)`);
    assertEqual(snapshot.html, (await d2Snap(HTML, rE, rA, rT)).html, "Not equivalent to d2Snap");
});

await test("Adaptive snapshot (max iterations)", async () => {
    const maxTokens = Math.round((UNREDUCED + MINIMAL) / 2);

    for(const maxIterations of [ 1, 2, 3 ]) {
        const snapshot = await adaptiveD2Snap(HTML, maxTokens, maxIterations);

        assertTrue(snapshot.adaptiveIterations <= maxIterations, `Too many iterations (${snapshot.adaptiveIterations} for max ${maxIterations})`);
    }

    const err = await adaptiveError(() => adaptiveD2Snap(HTML, maxTokens, 0));

    assertTrue(err instanceof RangeError, "No range error without iterations beyond the unreduced snapshot");
});

await test("Adaptive snapshot (unique IDs in the live DOM)", async () => {
    const documentAdaptive = new JSDOM(HTML).window.document;
    const documentDirect = new JSDOM(HTML).window.document;
    const ids = document => [ ...document.querySelectorAll("[data-uid]") ].map(element => element.getAttribute("data-uid"));

    const snapshot = await adaptiveD2Snap(documentAdaptive, Math.round((UNREDUCED + MINIMAL) / 2), 5, { uniqueIDs: true });
    const { rE, rA, rT } = snapshot.parameters;
    const direct = await d2Snap(documentDirect, rE, rA, rT, { uniqueIDs: true });

    assertEqual(ids(documentAdaptive), ids(documentDirect), "Live unique IDs differ from d2Snap");
    assertEqual(snapshot.html, direct.html, "Not equivalent to d2Snap (unique IDs)");
});

// ---------------------------------------------------------------------------
// adaptiveD2Snap failed for satisfiable token limits, while larger limits
// downsampled below them. A failure reports the most reduced snapshot's
// estimate: that limit and any larger one have to succeed (and be kept).
// ---------------------------------------------------------------------------
await test("Adaptive snapshots succeed from the reported last estimate on", async () => {
    const html = `
        <main class="page" id="menu" data-track="main-view" style="padding: 1rem">
            <!-- Seasonal menu, updated weekly -->
            <script>window.dataLayer = [];</script>
            <header class="header">
                <div class="wrapper">
                    <div class="inner">
                        <h1>Burger Bar</h1>
                        <a href="/order" class="cta" data-track="order-cta" title="Order online">Order now</a>
                    </div>
                </div>
            </header>
            <section class="intro">
                <div class="container">
                    <p>
                        Our burgers are made from fresh beef. Every patty is grilled over an open flame.
                        The buns are baked daily in our own bakery. We also serve vegetarian options.
                    </p>
                    <ul class="list">
                        <li><strong>Cheeseburger</strong> with <em>cheddar</em></li>
                        <li><strong>Veggie Burger</strong> with grilled halloumi</li>
                    </ul>
                </div>
            </section>
            <section class="gallery">
                <img src="/img/burger.jpg" alt="Cheeseburger">
                <svg viewBox="0 0 24 24" class="icon"><title>Cart</title><path d="M0 0h24v24H0z"></path></svg>
            </section>
            <form class="order-form" action="/submit">
                <div class="field">
                    <label for="size">Size</label>
                    <select id="size" name="size"><option value="m">Medium</option><option value="l">Large</option></select>
                </div>
                <button type="submit" aria-label="Place order" class="btn"></button>
            </form>
        </main>
    `;

    let lastEstimate = null;
    try {
        await adaptiveD2Snap(html, 1);
    } catch(err) {
        lastEstimate = err.meta?.lastEstimate;
    }

    assertTrue(Number.isInteger(lastEstimate), "No last estimate reported for an unsatisfiable limit");

    const unreducedEstimate = (await d2Snap(html, 0, 0, 0)).meta.tokenEstimate;
    const steps = 10;

    for(let i = 0; i <= steps; i++) {
        const maxTokens = Math.round(lastEstimate + (unreducedEstimate - lastEstimate) * i / steps);

        let snapshot = null;
        try {
            snapshot = await adaptiveD2Snap(html, maxTokens);
        } catch(err) {
            assertTrue(false, `Failed for a satisfiable limit (${maxTokens} >= last estimate ${lastEstimate}): ${err.message}`);
        }

        assertTrue(
            snapshot.meta.tokenEstimate <= maxTokens,
            `Token limit exceeded (${snapshot.meta.tokenEstimate} > ${maxTokens})`
        );
    }
});