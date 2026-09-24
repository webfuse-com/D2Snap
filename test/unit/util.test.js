import { JSDOM } from "jsdom";

import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { minifyDOM } from "../../dist.lib/util.dom.js";
import { isVoidElement, isInlineElement, isRawTextElement, formatHTML } from "../../dist.lib/util.html.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Minify DOM reflected upon serialization", async () => {
    const dom = new JSDOM(PIZZA_HTML).window;
    const domRoot = dom.document.documentElement;

    const htmlFalse = domRoot.outerHTML;

    await writeActual("pizza/pizza.minified.false", htmlFalse);
    const expectedFalse = await readExpected("pizza/pizza.minified.false");

    assertEqual(
        htmlFalse,
        expectedFalse,
        "Invalid un-minified DOM"
    );

    // In-place
    minifyDOM(domRoot);

    const htmlTrue = domRoot.outerHTML;

    await writeActual("pizza/pizza.minified.true", htmlTrue);
    const expectedTrue = await readExpected("pizza/pizza.minified.true");

    assertEqual(
        htmlTrue,
        expectedTrue,
        "Invalid minified DOM"
    );
});


await test("Is void element", async () => {
    assertTrue(isVoidElement("BR"), "Incorrectly classified element via tag name BR");
    assertTrue(!isVoidElement("div"), "Incorrectly classified element via tag name DIV");
});

await test("Is inline element", async () => {
    assertTrue(isInlineElement("STRONG"), "Incorrectly classified element via tag name STRONG");
    assertTrue(!isInlineElement("div"), "Incorrectly classified element via tag name DIV");
});

await test("Is raw-text element", async () => {
    assertTrue(isRawTextElement("SCRIPT"), "Incorrectly classified element via tag name SCRIPT");
    assertTrue(!isRawTextElement("div"), "Incorrectly classified element via tag name DIV");
});

await test("Format HTML", async () => {
    const formattedHTML = formatHTML(
        `<h1>Amsterdam</h1><p><strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.</p>`
    );

    assertEqual(
        formattedHTML,
        `
        <h1>
          Amsterdam
        </h1>
        <p>
          <strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.
        </p>
        `
            .replace(/\n {8}/g, "\n")
            .trim(),
        "Incorrectly formatted HTML"
    );
});