import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { preProcessDOM, postProcessDOM, postProcessHTML } from "../../dist.lib/D2Snap.processing.js";
import { isActionableElement } from "../../dist.lib/D2Snap.js";


const HOTDOG_HTML = await readTestFile("hotdog/hotdog");


await test("Pre-process DOM for snapshot (filtering)", async () => {
    const dom = new JSDOM(HOTDOG_HTML).window;
    const domRoot = dom.document.body;

    // No-processing options (expect identity)
    // In-place
    await preProcessDOM(domRoot, dom.document, {
        filter: {
            dataURLs: false,
            attributes: [],
            elements: []
        },
        isActionableElement
    });

    const htmlIdentity = domRoot.outerHTML;

    await writeActual("hotdog/hotdog.processed.dom.pre.identity", htmlIdentity);
    const expectedIdentity = await readExpected("hotdog/hotdog.processed.dom.pre.identity");

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
            attributes: [ "aria-disabled" ],
            elements: [ "main", "TEMPLATE", "noSCRIPT" ]
        },
        isActionableElement
    });

    const html = domRoot.outerHTML;

    await writeActual("hotdog/hotdog.processed.dom.pre", html);
    const expected = await readExpected("hotdog/hotdog.processed.dom.pre");

    assertEqual(
        flattenDOMSnapshot(html),
        flattenDOMSnapshot(expected),
        "Invalid pre-processed DOM"
    );

    // Same-processing options (expect idempotency)
    // In-place
    await preProcessDOM(domRoot, dom.document, {
        filter: {
            dataURLs: true,
            attributes: [ "aria-disabled" ],
            elements: [ "main", "TEMPLATE", "noSCRIPT" ]
        },
        isActionableElement
    });

    const htmlIdempotency = domRoot.outerHTML;

    await writeActual("hotdog/hotdog.processed.dom.pre.idempotency", htmlIdempotency);
    const expectedIdempotency = await readExpected("hotdog/hotdog.processed.dom.pre.idempotency");

    assertEqual(
        flattenDOMSnapshot(htmlIdempotency),
        flattenDOMSnapshot(expectedIdempotency),
        "Invalid pre-processed DOM (idempotency)"
    );
});

await test("Post-process DOM for snapshot (filtering)", async () => {
    const dom = new JSDOM(HOTDOG_HTML).window;
    const domRoot = dom.document.body;

    const isActionableElementFn = element => [ "ELEMENT-ACTIONABLE" ].includes(element.tagName.toUpperCase());

    // No-processing options (expect identity)
    // In-place
    await postProcessDOM(domRoot, {
        filter: {
            emptyElements: false
        }
    }, isActionableElementFn);

    const htmlIdentity = domRoot.outerHTML;

    await writeActual("hotdog/hotdog.processed.dom.post.identity", htmlIdentity);
    const expectedIdentity = await readExpected("hotdog/hotdog.processed.dom.post.identity");

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

    await writeActual("hotdog/hotdog.processed.dom.post", html);
    const expected = await readExpected("hotdog/hotdog.processed.dom.post");

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

    await writeActual("hotdog/hotdog.processed.dom.post.idempotency", htmlIdempotency);
    const expectedIdempotency = await readExpected("hotdog/hotdog.processed.dom.post.idempotency");

    assertEqual(
        flattenDOMSnapshot(htmlIdempotency),
        flattenDOMSnapshot(expectedIdempotency),
        "Invalid post-processed DOM (idempotency)"
    );
});

await test("Post-process HTML snapshot", async () => {
    const dom = new JSDOM(HOTDOG_HTML).window;
    const domRoot = dom.document.body;
    const rawHTML = domRoot.outerHTML;

    // No-processing options (expect identity)
    // In-place
    const htmlIdentity = await postProcessHTML(rawHTML, {
        debug: false,
		minify: false
    });

    await writeActual("hotdog/hotdog.processed.html.post.identity", htmlIdentity);
    const expectedIdentity = await readExpected("hotdog/hotdog.processed.html.post.identity");

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

    await writeActual("hotdog/hotdog.processed.html.post", html);
    const expected = await readExpected("hotdog/hotdog.processed.html.post");

    assertEqual(
        flattenDOMSnapshot(html),
        flattenDOMSnapshot(expected),
        "Invalid post-processed HTML"
    );
});


const NORMALIZING_PRE_PROCESSING_OPTIONS = {
    filter: {
        dataURLs: false,
        attributes: [],
        elements: [],
        emptyElements: false
    },
    normalize: {
        iconClasses: [ "fa", "my-icons" ],
        labelAttributes: [ "aria-labelledby", "aria-label", "title" ],
        svgToImg: true
    }
};

for(const fixture of [
    "hamburger.no-text",
    "hamburger.img.no-alt",
    "hamburger.img.svg",
    "hamburger.img.iconfont"
]) {
    await test(`Pre-process DOM for snapshot (normalization; ${fixture})`, async () => {
        const dom = new JSDOM(await readTestFile(`hamburger/${fixture}`)).window;
        const domRoot = dom.document.body;

        // Processing
        // In-place
        await preProcessDOM(
            domRoot,
            dom.document,
            NORMALIZING_PRE_PROCESSING_OPTIONS,
            isActionableElement
        );

        const html = domRoot.outerHTML;

        await writeActual(`hamburger/${fixture}.processed.dom.pre.normalized`, html);
        const expected = await readExpected(`hamburger/${fixture}.processed.dom.pre.normalized`);

        assertEqual(
            flattenDOMSnapshot(html),
            flattenDOMSnapshot(expected),
            `Invalid normalized pre-processed DOM (${fixture})`
        );

        // Same-processing options (expect idempotency)
        // In-place
        await preProcessDOM(
            domRoot,
            dom.document,
            NORMALIZING_PRE_PROCESSING_OPTIONS,
            isActionableElement
        );

        const htmlIdempotency = domRoot.outerHTML;

        await writeActual(`hamburger/${fixture}.processed.dom.pre.normalized.idempotency`, htmlIdempotency);

        assertEqual(
            flattenDOMSnapshot(htmlIdempotency),
            flattenDOMSnapshot(expected),
            `Invalid normalized pre-processed DOM (idempotency, ${fixture})`
        );
    });
}