import { isVoidElement, isInlineElement, isRawTextElement, formatHTML } from "../../dist.lib/util.html.js";


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