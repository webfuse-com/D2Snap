import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


// Attach declarative shadow roots (<template shadowrootmode>), as browsers do upon parsing.
const _attachDeclarativeShadowRoots = rootNode => {
    for(const templateElement of rootNode.querySelectorAll("template[shadowrootmode]")) {
        const shadowRoot = templateElement.parentElement.attachShadow({
            mode: templateElement.getAttribute("shadowrootmode")
        });

        shadowRoot.append(templateElement.content);
        templateElement.remove();

        _attachDeclarativeShadowRoots(shadowRoot);
    }
};


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.shadowDOM");


await test("Take DOM snapshot (options.shadowDOM)", async () => {
    const dom = new JSDOM(HAMBURGER_HTML).window;

    _attachDeclarativeShadowRoots(dom.document);

    const snapshotTrue = await d2Snap(dom.document, 0, 0.5, 0, {
        debug: true,
        shadowDOM: true
    });

    await writeActual("hamburger/hamburger.options.shadowDOM.true", snapshotTrue.html);
    const expectedTrue = await readExpected("hamburger/hamburger.options.shadowDOM.true");

    assertEqual(
        flattenDOMSnapshot(snapshotTrue.html),
        flattenDOMSnapshot(expectedTrue),
        "Invalid DOM snapshot (shadowDOM = true)"
    );

    assertIn(
        "Checkout",
        snapshotTrue.html,
        "Invalid DOM snapshot (shadowDOM = true; shadow content)"
    );

    const snapshotFalse = await d2Snap(dom.document, 0, 0.5, 0, {
        debug: true,
        shadowDOM: false
    });

    await writeActual("hamburger/hamburger.options.shadowDOM.false", snapshotFalse.html);
    const expectedFalse = await readExpected("hamburger/hamburger.options.shadowDOM.false");

    assertEqual(
        flattenDOMSnapshot(snapshotFalse.html),
        flattenDOMSnapshot(expectedFalse),
        "Invalid DOM snapshot (shadowDOM = false)"
    );

    assertNotIn(
        "Checkout",
        snapshotFalse.html,
        "Invalid DOM snapshot (shadowDOM = false; no shadow content)"
    );
});