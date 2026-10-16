import { readTestFile } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.output");


await test("DOM snapshot output type", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.6, 0.9);

    assertTrue(
        typeof(snapshot.dom) === "object",
        "Invalid DOM snapshot output type (dom)"
    );

    assertTrue(
        snapshot.dom.nodeType === 1,
        "Invalid DOM snapshot output type (dom; expects element)"
    );

    assertTrue(
        typeof(snapshot.html) === "string",
        "Invalid DOM snapshot output type (html)"
    );
});

await test("DOM snapshot HTML output scope", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.6, 0.9);

    assertNotIn(
        "<body",
        snapshot.innerHTML,
        "Invalid DOM snapshot HTML output scope (outerHTML; expects no BODY)"
    );

    assertEqual(
        snapshot.html,
        snapshot.innerHTML,
        "Invalid DOM snapshot HTML output scope (expects html === outerHTML; alias)"
    );

    assertIn(
        "<body",
        snapshot.outerHTML,
        "Invalid DOM snapshot HTML output scope (outerHTML; expects BODY)"
    );

    assertLess(
        snapshot.innerHTML.length,
        snapshot.outerHTML.length,
        "Invalid DOM snapshot HTML output scope lengths (expects |innerHTML| < |outerHTML|)"
    );
});