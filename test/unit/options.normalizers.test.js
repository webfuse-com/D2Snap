import { JSDOM } from "jsdom";

import {
    filterAttributes,
    filterComments,
    filterDataUrls,
    filterNoiseElements,
    filterEmptyImages,
    normalizeIconClassesToImgs,
    normalizeTextLabelAttributesToContent,
    normalizeSvgsToImgs,
    assignUniqueIds
} from "../../dist.lib/options.normalizers.js";
import { forAttributes, forComments, forElements, forTexts } from "../../dist.lib/options.normalizers/util.normalizers.js";
import { CLASSIFIERS, NORMALIZER_SETTINGS } from "../../dist.lib/constants.defaults.js";


// Normalizes all body nodes (pre-order, attributes after their element) in-place (virtual DOM is live DOM).
const _normalize = (html, normalizer) => {
    const dom = new JSDOM(html).window;
    const context = {
        classifiers: CLASSIFIERS,
        document: dom.document
    };

    const nodes = [];
    const walker = dom.document.createTreeWalker(dom.document.body, dom.NodeFilter.SHOW_ALL);
    while(walker.nextNode()) {
        nodes.push(walker.currentNode);

        (walker.currentNode.nodeType === 1)
            && nodes.push(...walker.currentNode.attributes);
    }

    for(const node of nodes) {
        normalizer(node, node, context);
    }

    return dom.document.body.innerHTML;
};

// Normalizes a virtual clone of all body nodes against the respective live nodes (virtual DOM is not live DOM).
const _normalizeAgainstLive = (liveDocument, normalizer) => {
    const virtualDocument = liveDocument.implementation.createHTMLDocument("");
    const virtualBody = virtualDocument.importNode(liveDocument.body, true);

    virtualDocument.documentElement.replaceChild(virtualBody, virtualDocument.body);

    const context = {
        classifiers: CLASSIFIERS,
        document: virtualDocument
    };

    const collect = root => {
        const nodes = [];
        const walker = root.ownerDocument.createTreeWalker(root, 0xFFFFFFFF);
        while(walker.nextNode()) nodes.push(walker.currentNode);

        return nodes;
    };

    const virtualNodes = collect(virtualBody);
    const liveNodes = collect(liveDocument.body);

    for(let i = 0; i < virtualNodes.length; i++) {
        normalizer(virtualNodes[i], liveNodes[i], context);
    }

    return virtualBody.innerHTML;
};


await test("Wrap typed normalizers (node type check)", () => {
    const visits = [];
    const record = nodeTypeName => (virtualTarget, _liveTarget, _context, settings) => {
        visits.push(`${nodeTypeName}:${virtualTarget.nodeName}:${settings?.tag ?? ""}`);
    };

    const normalizers = [
        forElements(record("element")),
        forAttributes(record("attribute")),
        forTexts(record("text")),
        forComments(record("comment"))
    ];

    _normalize(`<p class="menu">Pizza<!--order--></p>`, (virtualNode, liveNode, context) => {
        for(const normalizer of normalizers) {
            normalizer(virtualNode, liveNode, context, { tag: "s" });
        }
    });

    assertEqual(
        visits,
        [
            "element:P:s",
            "attribute:class:s",
            "text:#text:s",
            "comment:#comment:s"
        ],
        "Invalid typed normalizer dispatch"
    );
});

await test("Normalize: filter comments", () => {
    assertEqual(
        _normalize(`<p>Pizza<!-- order: --><!-- keep: vegan --></p>`, filterComments),
        "<p>Pizza</p>",
        "Invalid normalization (filterComments)"
    );
    assertEqual(
        _normalize(`<p>Pizza<!-- order: --><!-- keep: vegan --></p>`, (virtualNode, liveNode, context) => filterComments(virtualNode, liveNode, context, {
            keepPattern: /^\s*keep:/
        })),
        "<p>Pizza<!-- keep: vegan --></p>",
        "Invalid normalization (filterComments, keepPattern)"
    );
});

await test("Normalize: filter elements", () => {
    assertEqual(
        _normalize(`<div><script>order()</script><aside>Ad</aside>Kebab</div>`, filterNoiseElements),
        "<div><aside>Ad</aside>Kebab</div>",
        "Invalid normalization (filterNoiseElements)"
    );
    assertEqual(
        _normalize(`<div><script>order()</script><aside>Ad</aside>Kebab</div>`, (virtualNode, liveNode, context) => filterNoiseElements(virtualNode, liveNode, context, {
            tagNames: [ "aside" ]
        })),
        "<div><script>order()</script>Kebab</div>",
        "Invalid normalization (filterNoiseElements, tagNames)"
    );
});

await test("Normalize: filter attributes", () => {
    assertEqual(
        _normalize(`<div style="color: red" data-dish="1">Falafel</div>`, filterAttributes),
        `<div style="color: red" data-dish="1">Falafel</div>`,
        "Invalid normalization (filterAttributes)"
    );
    assertEqual(
        _normalize(`<div style="color: red" data-dish="1">Falafel</div>`, (virtualNode, liveNode, context) => filterAttributes(virtualNode, liveNode, context, {
            attributeNames: [ "STYLE" ]
        })),
        `<div data-dish="1">Falafel</div>`,
        "Invalid normalization (filterAttributes, attributeNames)"
    );
});

await test("Normalize: filter data URLs", () => {
    assertEqual(
        _normalize(`<img src="data:x" data-src="data:y" alt="Bread">`, filterDataUrls),
        `<img data-src="data:y" alt="Bread">`,
        "Invalid normalization (filterDataUrls)"
    );
    assertEqual(
        _normalize(`<img src="data:x" data-src="data:y" alt="Bread">`, (virtualNode, liveNode, context) => filterDataUrls(virtualNode, liveNode, context, {
            attributeNames: [ "src", "data-src" ]
        })),
        `<img alt="Bread">`,
        "Invalid normalization (filterDataUrls, attributeNames)"
    );
});

await test("Normalize: filter empty images", () => {
    assertEqual(
        _normalize(`<p><img><img alt="Bread"><img title="Bun"></p>`, filterEmptyImages),
        `<p><img alt="Bread"><img title="Bun"></p>`,
        "Invalid normalization (filterEmptyImages)"
    );
    assertEqual(
        _normalize(`<p><img><img alt="Bread"><img title="Bun"></p>`, (virtualNode, liveNode, context) => filterEmptyImages(virtualNode, liveNode, context, {
            labelAttributeNames: []
        })),
        `<p><img alt="Bread"></p>`,
        "Invalid normalization (filterEmptyImages, labelAttributeNames)"
    );
});

await test("Normalize: SVGs to images", () => {
    assertEqual(
        _normalize(`<p><svg><title>Burger Bar</title></svg><svg aria-label="Menu"></svg></p>`, normalizeSvgsToImgs),
        `<p><img alt="Burger Bar"><img alt="Menu"></p>`,
        "Invalid normalization (normalizeSvgsToImgs)"
    );
});

await test("Normalize: icon classes to images", () => {
    assertEqual(
        _normalize(`<p><i class="fa fa-pizza"></i><button class="fa-burger"></button></p>`, normalizeIconClassesToImgs),
        `<p><i class="fa fa-pizza"></i><button class="fa-burger"></button></p>`,
        "Invalid normalization (normalizeIconClassesToImgs)"
    );
    assertEqual(
        _normalize(`<p><i class="fa fa-pizza"></i><button class="fa-burger"></button></p>`, (virtualNode, liveNode, context) => normalizeIconClassesToImgs(virtualNode, liveNode, context, {
            iconClassPrefixes: [ "fa" ]
        })),
        `<p><img alt="pizza"><button class="fa-burger"><img alt="burger"></button></p>`,
        "Invalid normalization (normalizeIconClassesToImgs, iconClassPrefixes)"
    );
});

await test("Normalize: label attributes to content", () => {
    assertEqual(
        _normalize(`<p><span aria-label="Menu"></span><span data-label="Fries"></span><img title="Bun"></p>`, normalizeTextLabelAttributesToContent),
        `<p><span aria-label="Menu">Menu</span><span data-label="Fries"></span><img title="Bun" alt="Bun"></p>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent)"
    );
    assertEqual(
        _normalize(`<p><span aria-label="Menu"></span><span data-label="Fries"></span><img title="Bun"></p>`, (virtualNode, liveNode, context) => normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
            labelAttributeNames: [ ...NORMALIZER_SETTINGS.normalizeTextLabelAttributesToContent.labelAttributeNames, "data-label" ]
        })),
        `<p><span aria-label="Menu">Menu</span><span data-label="Fries">Fries</span><img title="Bun" alt="Bun"></p>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent, labelAttributeNames)"
    );
});

await test("Normalize: unique IDs", () => {
    assertEqual(
        _normalize(`<div><p>Nachos<br></p></div>`, (virtualNode, liveNode, context) => {
            // Distinct virtual node simulated (live element shared)
            (virtualNode.nodeType === 1)
                && assignUniqueIds(virtualNode.cloneNode(false), liveNode, context, {
                    attributeName: "data-test-id"
                });
        }),
        `<div data-test-id="0"><p data-test-id="1">Nachos<br></p></div>`,
        "Invalid normalization (assignUniqueIds, attributeName)"
    );
});

await test("Normalize: label attributes to content (label references)", () => {
    assertEqual(
        _normalize(`<span id="a">Cheese</span><span id="b">Burger</span><button aria-labelledby="a b"></button>`, normalizeTextLabelAttributesToContent),
        `<span id="a">Cheese</span><span id="b">Burger</span><button aria-labelledby="a b">Cheese Burger</button>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent, multiple label references)"
    );
    assertEqual(
        _normalize(`<button aria-labelledby="missing" aria-label="Menu"></button>`, normalizeTextLabelAttributesToContent),
        `<button aria-labelledby="missing" aria-label="Menu">Menu</button>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent, missing label reference fallback)"
    );

    // Label reference resolved in shadow root first
    const dom = new JSDOM(`<body><span id="l">Drive-through</span><x-counter></x-counter></body>`).window;
    const shadowRoot = dom.document.querySelector("x-counter").attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<span id="l">Counter</span><button aria-labelledby="l"></button>`;

    const liveButton = shadowRoot.querySelector("button");
    const virtualButton = liveButton.cloneNode(false);

    normalizeTextLabelAttributesToContent(virtualButton, liveButton, {
        classifiers: CLASSIFIERS,
        document: dom.document
    });

    assertEqual(
        virtualButton.textContent,
        "Counter",
        "Invalid normalization (normalizeTextLabelAttributesToContent, shadow root label reference)"
    );
});

await test("Normalize: label attributes resolved from live DOM", () => {
    const dom = new JSDOM(`<body><div id="l">Burrito</div><span aria-labelledby="l"></span></body>`).window;

    assertEqual(
        _normalizeAgainstLive(dom.document, (virtualNode, liveNode, context) => {
            // Referenced element removed in virtual DOM
            (virtualNode.nodeName === "DIV")
                && virtualNode.remove();

            normalizeTextLabelAttributesToContent(virtualNode, liveNode, context);
        }),
        `<span aria-labelledby="l">Burrito</span>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent, live DOM label reference)"
    );
});

await test("Normalize: SVGs to images (label sources)", () => {
    assertEqual(
        _normalize(`<p><svg><desc>Taco truck</desc></svg><span id="l">Hotdog stand</span><svg aria-labelledby="l"></svg><svg></svg></p>`, normalizeSvgsToImgs),
        `<p><img alt="Taco truck"><span id="l">Hotdog stand</span><img alt="Hotdog stand"><img></p>`,
        "Invalid normalization (normalizeSvgsToImgs, desc, label reference, no label)"
    );
    assertEqual(
        _normalize(`<p><svg title="Burger Bar"></svg></p>`, (virtualNode, liveNode, context) => normalizeSvgsToImgs(virtualNode, liveNode, context, {
            labelAttributeNames: []
        })),
        `<p><img></p>`,
        "Invalid normalization (normalizeSvgsToImgs, labelAttributeNames)"
    );
});

await test("Normalize: icon classes to images (classifiers context)", () => {
    const html = `<p><span class="fa-cart"></span></p>`;
    const dom = new JSDOM(html).window;
    const span = dom.document.querySelector("span");

    // Actionable (context classifier): image prepended, element kept
    normalizeIconClassesToImgs(span, span, {
        classifiers: {
            ...CLASSIFIERS,
            actionableElement: element => element.tagName === "SPAN"
        },
        document: dom.document
    }, {
        iconClassPrefixes: [ "fa" ]
    });

    assertEqual(
        dom.document.body.innerHTML,
        `<p><span class="fa-cart"><img alt="cart"></span></p>`,
        "Invalid normalization (normalizeIconClassesToImgs, actionable via context classifier)"
    );
    assertEqual(
        _normalize(`<p><i class="fa fa-pizza" aria-label="Margherita"></i><i class="fa-pizza">Pizza</i></p>`, (virtualNode, liveNode, context) => normalizeIconClassesToImgs(virtualNode, liveNode, context, {
            iconClassPrefixes: [ "fa" ]
        })),
        `<p><img alt="Margherita"><i class="fa-pizza">Pizza</i></p>`,
        "Invalid normalization (normalizeIconClassesToImgs, label precedence, text content)"
    );
});

await test("Normalize: unique IDs (stability)", () => {
    const dom = new JSDOM(`<body><div data-uid="7"><p>Sushi<img><br><input></p></div></body>`).window;
    const assignIDs = (virtualNode, liveNode, context) => assignUniqueIds(virtualNode, liveNode, context);

    const virtualHTML = _normalizeAgainstLive(dom.document, assignIDs);

    assertEqual(
        virtualHTML,
        `<div data-uid="7"><p data-uid="8">Sushi<img data-uid="9"><br><input data-uid="10"></p></div>`,
        "Invalid unique IDs (existing reused, continued after maximum, inline void elements skipped)"
    );
    assertEqual(
        dom.document.body.innerHTML,
        `<div data-uid="7"><p data-uid="8">Sushi<img data-uid="9"><br><input data-uid="10"></p></div>`,
        "Invalid unique IDs (live DOM)"
    );
    assertEqual(
        _normalizeAgainstLive(dom.document, assignIDs),
        virtualHTML,
        "Invalid unique IDs (stable across runs)"
    );

    // No live counterpart (virtual node is live node): skipped
    assertEqual(
        _normalize(`<div><p>Sushi</p></div>`, assignUniqueIds),
        `<div><p>Sushi</p></div>`,
        "Invalid unique IDs (no live counterpart)"
    );
});

await test("Normalize: label attributes (case-insensitive names, SVG)", () => {
    const labelAttributeNames = [ "ARIA-LABELLEDBY", "ARIA-LABEL", "TITLE" ];

    assertEqual(
        _normalize(`<p><span id="l">Burger Bar</span><svg aria-labelledby="l"></svg><svg aria-label="Menu"></svg></p>`, (virtualNode, liveNode, context) => normalizeSvgsToImgs(virtualNode, liveNode, context, {
            labelAttributeNames
        })),
        `<p><span id="l">Burger Bar</span><img alt="Burger Bar"><img alt="Menu"></p>`,
        "Invalid normalization (normalizeSvgsToImgs, upper case label attribute names on SVG)"
    );
    assertEqual(
        _normalize(`<p><button aria-label="Menu"></button></p>`, (virtualNode, liveNode, context) => normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
            labelAttributeNames
        })),
        `<p><button aria-label="Menu">Menu</button></p>`,
        "Invalid normalization (normalizeTextLabelAttributesToContent, upper case label attribute names)"
    );
});