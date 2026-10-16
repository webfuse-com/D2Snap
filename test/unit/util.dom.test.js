import { JSDOM } from "jsdom";

import { NodeFilter } from "../../dist.lib/enums.js";
import { minifyDOM, ensureDOM, traverseDom, resolveReplacingNodes, resolveComposedChildNodes, serializeSnapshotRoot } from "../../dist.lib/util.dom.js";


const DOCUMENT_HTML = `<!DOCTYPE html><html><head><title>Pizza</title></head><body><main><p>Pizza</p></main></body></html>`;
const MINIFYING_HTML = `<body>
  <div>
    <p>
      Crispy   fries
      <strong>with</strong> mayo
    </p>
    <br>
    extra  ketchup
    <textarea>  no   onions   </textarea>
  </div>
</body>`;


await test("Minify DOM reflected upon serialization", async () => {
    const dom = new JSDOM(MINIFYING_HTML).window;
    const domRoot = dom.document.body;

    assertEqual(
        domRoot.outerHTML,
        MINIFYING_HTML,
        "Invalid un-minified DOM"
    );

    // In-place
    minifyDOM(domRoot);

    assertEqual(
        domRoot.outerHTML,
        `<body><div><p>Crispy fries <strong>with</strong> mayo</p><br>extra ketchup<textarea>  no   onions   </textarea></div></body>`,
        "Invalid minified DOM"
    );
});

await test("Ensure DOM value from equivalent input (HTML-string, element, document)", async () => {
    assertTrue(
        !!(await ensureDOM(DOCUMENT_HTML))?.body,
        "Incorrectly ensured DOM (string)"
    );
    assertTrue(
        !!(await ensureDOM(Buffer.from(DOCUMENT_HTML, "utf8")))?.body,
        "Incorrectly ensured DOM (Buffer)"
    );
    assertTrue(
        (await ensureDOM(new JSDOM(DOCUMENT_HTML).window.document))?.nodeType === 9,
        "Incorrectly ensured DOM (Document)"
    );
    assertTrue(
        (await ensureDOM(new JSDOM(DOCUMENT_HTML).window.document.body.firstChild))?.nodeType === 1,
        "Incorrectly ensured DOM (Element)"
    );
});

await test("Traverse DOM (pre-order, latest DOM)", async () => {
    const dom = new JSDOM(`<body><div id="r"><a>Pizza</a><svg><title>Burger</title></svg><b>Taco</b><i></i><p><span>Sushi</span></p><c>Kebab</c></div></body>`).window;
    const document = dom.document;
    const root = document.getElementById("r");

    const visits = [];
    traverseDom(root, NodeFilter.SHOW_ELEMENT, elementNode => {
        visits.push(elementNode.tagName);

        // Inserted child (traversed)
        (elementNode.tagName === "A")
            && elementNode.prepend(document.createElement("em"));
        // Replacement (traversed instead of original subtree)
        (elementNode.tagName === "svg")
            && elementNode.replaceWith(document.createElement("img"));
        // Removed sibling (skipped)
        (elementNode.tagName === "B")
            && elementNode.nextElementSibling.remove();
        // Unwrapped container (children traversed)
        (elementNode.tagName === "P")
            && elementNode.replaceWith(...elementNode.childNodes);
    });

    assertEqual(
        visits,
        [ "A", "EM", "svg", "IMG", "B", "P", "SPAN", "C" ],
        "Invalid DOM traversal"
    );
});

await test("Traverse DOM (returned replacement nodes, attributes)", async () => {
    const dom = new JSDOM(`<body><div id="r"><p class="menu" title="Daily specials">Fries</p><table><tr><td>Hotdog</td></tr></table></div></body>`).window;
    const document = dom.document;
    const root = document.getElementById("r");

    const visits = [];
    traverseDom(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_ATTRIBUTE, node => {
        visits.push((node.nodeType === 2) ? `@${node.name}` : node.nodeName);

        // Attribute removed by previous attribute callback (skipped)
        (node.nodeType === 2 && node.name === "class")
            && node.ownerElement.removeAttribute("title");

        if(node.nodeName !== "TABLE") return;

        // Same-tag replacement returned stripped (not re-traversed)
        const replacement = node.cloneNode(true);
        node.replaceWith(replacement);

        return [];
    });

    assertEqual(
        visits,
        [ "@class", "P", "TABLE" ],
        "Invalid DOM traversal (returned replacement nodes, attributes before element)"
    );
});

await test("Resolve nodes replacing a detached node", async () => {
    const dom = new JSDOM(`<body><a></a><b></b><c></c></body>`).window;
    const document = dom.document;
    const b = document.querySelector("b");
    const [ parentNode, previousSibling, nextSibling ] = [ b.parentNode, b.previousSibling, b.nextSibling ];

    b.replaceWith(document.createElement("x"), document.createElement("y"));

    assertEqual(
        resolveReplacingNodes(parentNode, previousSibling, nextSibling).map(node => node.nodeName),
        [ "X", "Y" ],
        "Invalid replacing nodes"
    );
});

await test("Resolve composed child nodes (shadow DOM)", async () => {
    const dom = new JSDOM(`<body><x-order><span slot="title">Your order</span><b>2 tacos</b><i slot="none">Napkins</i></x-order></body>`).window;
    const host = dom.document.querySelector("x-order");

    host
        .attachShadow({ mode: "open" })
        .innerHTML = `<h2><slot name="title">fallback</slot></h2><slot></slot><slot name="empty">fallback</slot>`;

    assertEqual(
        resolveComposedChildNodes(host).map(node => node.nodeName),
        [ "H2", "B", "#text" ],
        "Invalid composed child nodes (host)"
    );
    assertEqual(
        resolveComposedChildNodes(host.shadowRoot.firstChild).map(node => node.nodeName),
        [ "SPAN" ],
        "Invalid composed child nodes (slot parent)"
    );
});

await test("Traverse DOM (detached root)", async () => {
    const dom = new JSDOM().window;
    const root = dom.document.createElement("div");

    root.innerHTML = `<a>Pizza</a><b>Burger</b><c>Taco</c>`;

    const visits = [];
    traverseDom(root, NodeFilter.SHOW_ELEMENT, elementNode => {
        visits.push(elementNode.tagName);

        (elementNode.tagName === "A")
            && elementNode.nextElementSibling.remove();
    });

    assertEqual(
        visits,
        [ "A", "C" ],
        "Invalid DOM traversal (detached root)"
    );
});

await test("Traverse DOM (node filters)", async () => {
    const dom = new JSDOM(`<body><div id="r"><p class="menu">Pizza<!--order--></p>Fries</div></body>`).window;
    const root = dom.document.getElementById("r");

    const traverse = filter => {
        const visits = [];

        traverseDom(root, filter, node => {
            visits.push((node.nodeType === 2) ? `@${node.name}` : node.nodeName);
        });

        return visits;
    };

    assertEqual(
        traverse(NodeFilter.SHOW_TEXT),
        [ "#text", "#text" ],
        "Invalid DOM traversal (text nodes)"
    );
    assertEqual(
        traverse(NodeFilter.SHOW_COMMENT),
        [ "#comment" ],
        "Invalid DOM traversal (comment nodes)"
    );
    assertEqual(
        traverse(NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_ATTRIBUTE),
        [ "@class", "P" ],
        "Invalid DOM traversal (attribute and element nodes)"
    );
    assertEqual(
        traverse(NodeFilter.SHOW_ALL),
        [ "@class", "P", "#text", "#comment", "#text" ],
        "Invalid DOM traversal (all nodes)"
    );
});

await test("Resolve nodes replacing a detached node (removed, moved siblings)", async () => {
    const dom = new JSDOM(`<body><a></a><b></b><c></c></body>`).window;
    const document = dom.document;
    const b = document.querySelector("b");
    const [ parentNode, previousSibling, nextSibling ] = [ b.parentNode, b.previousSibling, b.nextSibling ];

    b.remove();

    assertEqual(
        resolveReplacingNodes(parentNode, previousSibling, nextSibling),
        [],
        "Invalid replacing nodes (removed)"
    );

    previousSibling.remove();

    assertEqual(
        resolveReplacingNodes(parentNode, previousSibling, nextSibling),
        [],
        "Invalid replacing nodes (previous sibling detached)"
    );
});

await test("Serialize root as covered by snapshots", async () => {
    const dom = new JSDOM(`<html><head><title>Burger Bar</title></head><body><section class="card"><h2>Fries</h2></section></body></html>`).window;
    const document = dom.document;

    assertEqual(
        serializeSnapshotRoot(document.documentElement),
        `<section class="card"><h2>Fries</h2></section>`,
        "Invalid snapshot root serialization (HTML; BODY contents, no HEAD)"
    );
    assertEqual(
        serializeSnapshotRoot(document.body),
        `<section class="card"><h2>Fries</h2></section>`,
        "Invalid snapshot root serialization (BODY; contents)"
    );
    assertEqual(
        serializeSnapshotRoot(document.querySelector("section")),
        `<section class="card"><h2>Fries</h2></section>`,
        "Invalid snapshot root serialization (element; incl. element)"
    );
});

await test("Minify DOM (preformatted whitespace preserved)", async () => {
    const dom = new JSDOM(`<body><main>
  <pre>  extra
   ketchup  </pre>
  <pre><code>if(fries) {
    order();
}</code></pre>
  <p>  crispy
     fries  </p>
</main></body>`).window;
    const domRoot = dom.document.body;

    minifyDOM(domRoot);

    assertEqual(
        domRoot.innerHTML,
        `<main><pre>  extra\n   ketchup  </pre><pre><code>if(fries) {\n    order();\n}</code></pre><p>crispy fries</p></main>`,
        "Invalid minified DOM (preformatted whitespace incl. nested markup preserved)"
    );
});