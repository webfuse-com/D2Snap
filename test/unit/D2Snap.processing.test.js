import { JSDOM } from "jsdom";

import { preProcessDOM, postProcessDOM, postProcessHTML } from "../../dist.lib/processing.js";
import { CLASSIFIERS, NORMALIZERS } from "../../dist.lib/constants.defaults.js";
import {
    filterAttributes,
    filterComments,
    filterDataUrls,
    filterNoiseElements,
    normalizeIconClassesToImgs,
    normalizeTextLabelAttributesToContent,
    normalizeSvgsToImgs
} from "../../dist.lib/options.normalizers.js";
import { forElements } from "../../dist.lib/options.normalizers/util.normalizers.js";


const FILTERING_HTML = `<body><main><p>Daily specials</p></main><div aria-disabled="" class="menu"><!-- order: --><template><p>Taco</p></template><noscript>Ordering disabled</noscript><img src="data:image/png;base64,AA" alt="Bread"><img src="bun.png"><p>Our hotdogs</p></div></body>`;
const EMPTY_ELEMENTS_HTML = `<body><div><section><div></div></section><element-actionable></element-actionable><p> </p><span>Fries</span><br></div></body>`;
const FORMATTING_HTML = `<div><h1>Our Burgers</h1><p>Flame-grilled <strong>beef</strong></p><br></div>`;
const MINIFYING_HTML = `<body>
  <div>
    <p>
      Crispy   fries
      <strong>with</strong> mayo
    </p>
  </div>
</body>`;

const FILTERING_PRE_PROCESSING_OPTIONS = {
    classifiers: CLASSIFIERS,
    normalizers: [
        filterComments,
        (virtualNode, liveNode, context) => filterNoiseElements(virtualNode, liveNode, context, {
            tagNames: [ "main", "TEMPLATE", "noSCRIPT" ]
        }),
        (virtualNode, liveNode, context) => filterAttributes(virtualNode, liveNode, context, {
            attributeNames: [ "aria-disabled" ]
        }),
        filterDataUrls
    ],
    shadowDOM: false
};


await test("Pre-process DOM for snapshot (filtering)", async () => {
    const dom = new JSDOM(FILTERING_HTML).window;
    const domRoot = dom.document.body;

    // No-processing options (expect identity)
    // In-place (virtual DOM root is live DOM root)
    await preProcessDOM(domRoot, domRoot, dom.document, {
        classifiers: CLASSIFIERS,
        normalizers: [],
        shadowDOM: false
    });

    assertEqual(
        domRoot.outerHTML,
        new JSDOM(FILTERING_HTML).window.document.body.outerHTML,
        "Invalid pre-processed DOM (identity)"
    );

    // Processing
    // In-place
    await preProcessDOM(domRoot, domRoot, dom.document, FILTERING_PRE_PROCESSING_OPTIONS);

    const expected = `<div class="menu"><img alt="Bread"><img src="bun.png"><p>Our hotdogs</p></div>`;

    assertEqual(
        domRoot.innerHTML,
        expected,
        "Invalid pre-processed DOM"
    );

    // Same-processing options (expect idempotency)
    // In-place
    await preProcessDOM(domRoot, domRoot, dom.document, FILTERING_PRE_PROCESSING_OPTIONS);

    assertEqual(
        domRoot.innerHTML,
        expected,
        "Invalid pre-processed DOM (idempotency)"
    );
});

await test("Post-process DOM for snapshot (filtering)", async () => {
    const dom = new JSDOM(EMPTY_ELEMENTS_HTML).window;
    const domRoot = dom.document.body;

    const isActionableElementFn = element => [ "ELEMENT-ACTIONABLE" ].includes(element.tagName.toUpperCase());

    // No-processing options (expect identity)
    // In-place
    await postProcessDOM(domRoot, {
        filterEmptyElements: false,
        minify: false
    }, isActionableElementFn);

    assertEqual(
        domRoot.outerHTML,
        new JSDOM(EMPTY_ELEMENTS_HTML).window.document.body.outerHTML,
        "Invalid post-processed DOM (identity)"
    );

    // Processing
    // In-place
    await postProcessDOM(domRoot, {
        filterEmptyElements: true,
        minify: false
    }, isActionableElementFn);

    const expected = `<div><element-actionable></element-actionable><span>Fries</span><br></div>`;

    assertEqual(
        domRoot.innerHTML,
        expected,
        "Invalid post-processed DOM"
    );

    // Same-processing options (expect idempotency)
    // In-place
    await postProcessDOM(domRoot, {
        filterEmptyElements: true,
        minify: false
    }, isActionableElementFn);

    assertEqual(
        domRoot.innerHTML,
        expected,
        "Invalid post-processed DOM (idempotency)"
    );
});

await test("Post-process HTML snapshot", async () => {
    // No-processing options (expect identity)
    const htmlIdentity = await postProcessHTML(FORMATTING_HTML, {
        debug: false
    });

    assertEqual(
        htmlIdentity,
        FORMATTING_HTML,
        "Invalid post-processed HTML (identity)"
    );

    // Processing
    const html = await postProcessHTML(FORMATTING_HTML, {
        debug: true
    });

    assertEqual(
        html,
        `
        <div>
          <h1>
            Our Burgers
          </h1>
          <p>
            Flame-grilled <strong>beef</strong>
          </p>
          <br>
        </div>
        `
            .replace(/\n {8}/g, "\n")
            .trim(),
        "Invalid post-processed HTML"
    );
});


const NORMALIZING_LABEL_ATTRIBUTE_NAMES = [ "aria-labelledby", "aria-label", "title" ];

const NORMALIZING_PRE_PROCESSING_OPTIONS = {
    classifiers: CLASSIFIERS,
    normalizers: [
        filterComments,
        (virtualNode, liveNode, context) => normalizeSvgsToImgs(virtualNode, liveNode, context, {
            labelAttributeNames: NORMALIZING_LABEL_ATTRIBUTE_NAMES
        }),
        (virtualNode, liveNode, context) => normalizeIconClassesToImgs(virtualNode, liveNode, context, {
            iconClassPrefixes: [ "fa", "my-icons" ],
            labelAttributeNames: NORMALIZING_LABEL_ATTRIBUTE_NAMES
        }),
        (virtualNode, liveNode, context) => normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
            labelAttributeNames: NORMALIZING_LABEL_ATTRIBUTE_NAMES
        })
    ],
    shadowDOM: false
};

const NORMALIZING_FIXTURES = {
    "hamburger.no-text": [
        `<button aria-label="Menu"></button>`,
        `<button aria-label="Menu">Menu</button>`
    ],
    "hamburger.img.no-alt": [
        `<button><img src="menu.png"></button><img title="Burger Bar" src="logo.png">`,
        `<button><img src="menu.png"></button><img title="Burger Bar" src="logo.png" alt="Burger Bar">`
    ],
    "hamburger.img.svg": [
        `<button><svg aria-label="Menu"><path d="M0"></path></svg></button><svg><title>Burger Bar</title></svg>`,
        `<button><img alt="Menu"></button><img alt="Burger Bar">`
    ],
    "hamburger.img.iconfont": [
        `<button><i class="fa fa-bars"></i></button><span class="my-icons-cart"></span>`,
        `<button><img alt="bars"></button><img alt="cart">`
    ]
};

for(const [ fixture, [ html, expected ] ] of Object.entries(NORMALIZING_FIXTURES)) {
    await test(`Pre-process DOM for snapshot (normalization; ${fixture})`, async () => {
        const dom = new JSDOM(`<body>${html}</body>`).window;
        const domRoot = dom.document.body;

        // Processing
        // In-place
        await preProcessDOM(
            domRoot,
            domRoot,
            dom.document,
            NORMALIZING_PRE_PROCESSING_OPTIONS
        );

        assertEqual(
            domRoot.innerHTML,
            expected,
            `Invalid normalized pre-processed DOM (${fixture})`
        );

        // Same-processing options (expect idempotency)
        // In-place
        await preProcessDOM(
            domRoot,
            domRoot,
            dom.document,
            NORMALIZING_PRE_PROCESSING_OPTIONS
        );

        assertEqual(
            domRoot.innerHTML,
            expected,
            `Invalid normalized pre-processed DOM (idempotency, ${fixture})`
        );
    });
}

await test("Pre-process DOM for snapshot (live counterparts)", async () => {
    const liveDOM = new JSDOM(`<body><div id="l">Burrito</div><span aria-labelledby="l"></span></body>`).window;
    const virtualDOM = new JSDOM(liveDOM.document.body.outerHTML).window;

    // Referenced label element removed in virtual DOM before label resolution
    await preProcessDOM(virtualDOM.document.body, liveDOM.document.body, virtualDOM.document, {
        classifiers: CLASSIFIERS,
        normalizers: [
            (virtualNode, liveNode, context) => filterNoiseElements(virtualNode, liveNode, context, {
                tagNames: [ "DIV" ]
            }),
            normalizeTextLabelAttributesToContent
        ],
        shadowDOM: false
    });

    assertEqual(
        virtualDOM.document.body.innerHTML,
        `<span aria-labelledby="l">Burrito</span>`,
        "Invalid label resolution via live DOM"
    );
    assertEqual(
        liveDOM.document.body.innerHTML,
        `<div id="l">Burrito</div><span aria-labelledby="l"></span>`,
        "Invalid live DOM mutation"
    );
});

await test("Pre-process DOM for snapshot (shadow DOM)", async () => {
    const liveDOM = new JSDOM(`<body><x-order><span slot="title">Your order</span><b>2 tacos</b></x-order></body>`).window;
    liveDOM.document.querySelector("x-order")
        .attachShadow({ mode: "open" })
        .innerHTML = `<h2><slot name="title">fallback</slot></h2><div><button>Checkout</button><slot></slot></div>`;

    for(const shadowDOM of [ true, false ]) {
        const virtualDocument = liveDOM.document.implementation.createHTMLDocument("");
        const virtualDomRoot = virtualDocument.importNode(liveDOM.document.body, true);

        virtualDocument.documentElement.replaceChild(virtualDomRoot, virtualDocument.body);

        await preProcessDOM(virtualDomRoot, liveDOM.document.body, virtualDocument, {
            classifiers: CLASSIFIERS,
            normalizers: [],
            shadowDOM
        });

        assertEqual(
            virtualDomRoot.innerHTML,
            shadowDOM
                ? `<x-order><h2><span slot="title">Your order</span></h2><div><button>Checkout</button><b>2 tacos</b></div></x-order>`
                : `<x-order><span slot="title">Your order</span><b>2 tacos</b></x-order>`,
            `Invalid composed DOM (shadowDOM: ${shadowDOM})`
        );
    }
});

await test("Pre-process DOM for snapshot (live counterparts of replacements)", async () => {
    const liveDOM = new JSDOM(`<body><svg id="s"><title>Burger Bar</title></svg></body>`).window;
    const virtualDOM = new JSDOM(liveDOM.document.body.outerHTML).window;

    const liveCounterparts = [];

    await preProcessDOM(virtualDOM.document.body, liveDOM.document.body, virtualDOM.document, {
        classifiers: CLASSIFIERS,
        normalizers: [
            normalizeSvgsToImgs,
            forElements((virtualElement, liveElement) => {
                liveCounterparts.push(`${virtualElement.tagName}:${liveElement.tagName}#${liveElement.id}`);
            })
        ],
        shadowDOM: false
    });

    assertEqual(
        liveCounterparts,
        [ "IMG:svg#s" ],
        "Invalid live counterpart of replacement (inherited from replaced element)"
    );
});

await test("Pre-process DOM for snapshot (wrapped snippet)", async () => {
    const liveDOM = new JSDOM(`<body><section aria-label="Sides"><div id="l">Burrito</div><span aria-labelledby="l"></span></section></body>`).window;
    const liveDomRoot = liveDOM.document.querySelector("section");

    // Snippet clone wrapped by BODY (virtual DOM root), paired with snippet (live DOM root)
    const virtualDocument = liveDOM.document.implementation.createHTMLDocument("");
    virtualDocument.body.appendChild(virtualDocument.importNode(liveDomRoot, true));

    await preProcessDOM(virtualDocument.body, liveDomRoot, virtualDocument, {
        classifiers: CLASSIFIERS,
        normalizers: [
            (virtualNode, liveNode, context) => filterNoiseElements(virtualNode, liveNode, context, {
                tagNames: [ "DIV" ]
            }),
            normalizeTextLabelAttributesToContent
        ],
        shadowDOM: false
    });

    assertEqual(
        virtualDocument.body.innerHTML,
        `<section aria-label="Sides"><span aria-labelledby="l">Burrito</span></section>`,
        "Invalid pre-processed DOM (wrapped snippet; snippet root normalized, live labels)"
    );
});

await test("Post-process DOM for snapshot (minify)", async () => {
    const dom = new JSDOM(MINIFYING_HTML).window;
    const domRoot = dom.document.body;

    // In-place
    await postProcessDOM(domRoot, {
        filterEmptyElements: false,
        minify: true
    }, () => false);

    assertEqual(
        domRoot.innerHTML,
        `<div><p>Crispy fries <strong>with</strong> mayo</p></div>`,
        "Invalid post-processed DOM (minify)"
    );
});

await test("Pre-process DOM for snapshot (attribute normalizers before element normalizers)", async () => {
    const dom = new JSDOM(`<body><p><img src="data:image/png;base64,AA"><img src="data:image/png;base64,AA" alt="Bread"></p></body>`).window;
    const domRoot = dom.document.body;

    // In-place
    await preProcessDOM(domRoot, domRoot, dom.document, {
        classifiers: CLASSIFIERS,
        normalizers: NORMALIZERS,
        shadowDOM: false
    });

    assertEqual(
        domRoot.innerHTML,
        `<p><img alt="Bread"></p>`,
        "Invalid pre-processed DOM (data URL filtered before empty image check)"
    );
});