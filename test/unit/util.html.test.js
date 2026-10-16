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

await test("Format HTML (raw text, comments, void elements)", async () => {
    const formattedHTML = formatHTML(
        `<div><!-- order: --><script>if(fries < 1) order();</script><br><hr><span>Fries</span></div>`
    );

    assertEqual(
        formattedHTML,
        `
        <div>
          <!-- order: -->
          <script>if(fries < 1) order();</script>
          <br><hr><span>Fries</span>
        </div>
        `
            .replace(/\n {8}/g, "\n")
            .trim(),
        "Incorrectly formatted HTML (raw text, comments, void elements)"
    );
});

await test("Format HTML (preformatted elements verbatim)", async () => {
    const html = `<div><pre>  extra\n   ketchup  </pre><pre><code>if(fries) {\n    order();\n}</code></pre></div>`;
    const formattedHTML = formatHTML(html);

    assertEqual(
        formattedHTML,
        `<div>\n  <pre>  extra\n   ketchup  </pre>\n  <pre><code>if(fries) {\n    order();\n}</code></pre>\n</div>`,
        "Incorrectly formatted HTML (preformatted elements not verbatim)"
    );
    assertEqual(
        formatHTML(formattedHTML),
        formattedHTML,
        "Incorrectly formatted HTML (not idempotent)"
    );
});

await test("Format HTML (whitespace between inline elements kept)", async () => {
    const formattedHTML = formatHTML(`<div><a href="/fries">Fries</a> <a href="/dips">Dips</a><b>Hot</b> <i>Dogs</i></div>`);

    assertEqual(
        formattedHTML,
        `<div>\n  <a href="/fries">Fries</a> <a href="/dips">Dips</a><b>Hot</b> <i>Dogs</i>\n</div>`,
        "Incorrectly formatted HTML (whitespace between inline elements dropped)"
    );
    assertEqual(
        formatHTML(formattedHTML),
        formattedHTML,
        "Incorrectly formatted HTML (not idempotent)"
    );
});