import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { preProcessDOM, postProcessDOM, postProcessHTML } from "../../dist.lib/D2Snap.processing.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Pre-process DOM for snapshot", async () => {
    const dom = new JSDOM(PIZZA_HTML).window;
    const domRoot = dom.document.querySelector("#analytics");

    // No-processing options (expect identity)
    // In-place
    await preProcessDOM(domRoot, dom.document, {
        filter: {
            dataURLs: false,
            tagNames: []
        },
        uniqueIDs: false
    });

    const htmlIdentity = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.pre.identity", htmlIdentity);
    const expectedIdentity = await readExpected("pizza/pizza.processed.dom.pre.identity");

    assertEqual(
        flattenDOMSnapshot(htmlIdentity),
        flattenDOMSnapshot(expectedIdentity),
        "Invalid pre-processed DOM (identity)"
    );

    // Processing
    // In-place
    await preProcessDOM(domRoot, dom.document, {
        filter: {
            dataURLs: true,
            tagNames: [ "main", "TEMPLATE", "noSCRIPT" ]
        },
        uniqueIDs: true
    });

    const html = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.pre", html);
    const expected = await readExpected("pizza/pizza.processed.dom.pre");

    assertEqual(
        flattenDOMSnapshot(html),
        flattenDOMSnapshot(expected),
        "Invalid pre-processed DOM"
    );

    // Same-processing options (expect idempotency)
    // In-place
    await preProcessDOM(domRoot, dom.document, {
        filter: {
            dataURLs: false,
            tagNames: []
        },
        uniqueIDs: false
    });

    const htmlIdempotency = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.pre.idempotency", htmlIdempotency);
    const expectedIdempotency = await readExpected("pizza/pizza.processed.dom.pre.idempotency");

    assertEqual(
        flattenDOMSnapshot(htmlIdempotency),
        flattenDOMSnapshot(expectedIdempotency),
        "Invalid pre-processed DOM (idempotency)"
    );
});

await test("Post-process DOM for snapshot", async () => {
    const dom = new JSDOM(PIZZA_HTML).window;
    const domRoot = dom.document.querySelector("#analytics");

    const isActionableElementFn = element => [ "IMG" ].includes(element.tagName.toUpperCase());

    // No-processing options (expect identity)
    // In-place
    await postProcessDOM(domRoot, {
        filter: {
            emptyElements: false
        }
    }, isActionableElementFn);

    const htmlIdentity = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.post.identity", htmlIdentity);
    const expectedIdentity = await readExpected("pizza/pizza.processed.dom.post.identity");

    assertEqual(
        flattenDOMSnapshot(htmlIdentity),
        flattenDOMSnapshot(expectedIdentity),
        "Invalid post-processed DOM (identity)"
    );

    // Processing
    // In-place
    await postProcessDOM(domRoot, {
        filter: {
            emptyElements: true
        }
    }, isActionableElementFn);

    const html = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.post", html);
    const expected = await readExpected("pizza/pizza.processed.dom.post");

    assertEqual(
        flattenDOMSnapshot(html),
        flattenDOMSnapshot(expected),
        "Invalid post-processed DOM"
    );

    // Same-processing options (expect idempotency)
    // In-place
    await postProcessDOM(domRoot, {
        filter: {
            emptyElements: true
        }
    }, isActionableElementFn);

    const htmlIdempotency = domRoot.outerHTML;

    await writeActual("pizza/pizza.processed.dom.post.idempotency", htmlIdempotency);
    const expectedIdempotency = await readExpected("pizza/pizza.processed.dom.post.idempotency");

    assertEqual(
        flattenDOMSnapshot(htmlIdempotency),
        flattenDOMSnapshot(expectedIdempotency),
        "Invalid post-processed DOM (idempotency)"
    );
});

await test("Post-process HTML snapshot", async () => {
    const dom = new JSDOM(PIZZA_HTML).window;
    const domRoot = dom.document.querySelector("#analytics");
    const rawHTML = domRoot.outerHTML;

    // No-processing options (expect identity)
    // In-place
    const htmlIdentity = await postProcessHTML(rawHTML, {
        debug: false,
		minify: false
    });

    await writeActual("pizza/pizza.processed.html.post.identity", htmlIdentity);
    const expectedIdentity = await readExpected("pizza/pizza.processed.html.post.identity");

    assertEqual(
        htmlIdentity,
        expectedIdentity,
        "Invalid post-processed HTML (identity)"
    );

    // Processing
    const html = await postProcessHTML(rawHTML, {
        debug: true,
		minify: true
    });

    await writeActual("pizza/pizza.processed.html.post", html);
    const expected = await readExpected("pizza/pizza.processed.html.post");

    assertEqual(
        flattenDOMSnapshot(html),
        flattenDOMSnapshot(expected),
        "Invalid post-processed HTML"
    );
});