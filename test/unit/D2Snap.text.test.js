import { JSDOM } from "jsdom";

import { snapTextBlocks, snapTextSiblings } from "../../dist.lib/D2Snap.text.js";


// Deterministic ranker: sentences containing "KEEP" first
const keepRanker = sentences => [
    ...sentences.filter(sentence => sentence.includes("KEEP")),
    ...sentences.filter(sentence => !sentence.includes("KEEP"))
];
const isActionableElement = element => [ "A", "BUTTON" ].includes(element.tagName);

function snap(html, ratio = 0, ranker = keepRanker) {
    const document = new JSDOM(`<body>${html}</body>`).window.document;

    snapTextBlocks(document.body, ratio, ranker, isActionableElement);

    return document.body.innerHTML;
}


await test("Snap text blocks (sibling text nodes form one text)", () => {
    assertEqual(
        snap(`<p>Drop this <i>one</i>. A KEEP sentence with <b>bold</b> parts. Drop <i>that</i> too.</p>`),
        `<p> A KEEP sentence with <b>bold</b> parts. </p>`,
        "Invalid text (kept sentence intact incl. its elements, elements of dropped sentences removed)"
    );
});

await test("Snap text blocks (element membership)", () => {
    assertEqual(
        snap(`<p>KEEP this.<sup>1</sup> Drop that.<sup>2</sup></p>`),
        `<p>KEEP this.<sup>1</sup> </p>`,
        "Invalid text (element right after a sentence end belongs to that sentence)"
    );
    assertEqual(
        snap(`<p>Drop this. <i>M</i> KEEP that.</p>`),
        `<p> <i>M</i> KEEP that.</p>`,
        "Invalid text (element after boundary whitespace belongs to the next sentence)"
    );
});

await test("Snap text blocks (actionable elements)", () => {
    assertEqual(
        snap(`<p>KEEP this one. The <a href="/x">link</a> sentence.</p>`),
        `<p> The <a href="/x">link</a> sentence.</p>`,
        "Invalid text (sentence with actionable ranks first)"
    );
    assertEqual(
        snap(`<p>A <a href="/x">first</a> link. A <a href="/y">second</a> link.</p>`),
        `<p>A <a href="/x">first</a> link. <a href="/y">second</a> </p>`,
        "Invalid text (actionable of a dropped sentence kept)"
    );
});

await test("Snap text blocks (element boundaries are hard boundaries)", () => {
    assertEqual(
        snap(`<h2>Heading one. Heading two.</h2><p>KEEP this. Drop this. <button>Label one. Label two.</button></p>`, 0, sentences => sentences),
        `<h2>Heading one. </h2><p>KEEP this. <button>Label one. </button></p>`,
        "Invalid text (heading, paragraph, and actionable texts downsampled each)"
    );
});

await test("Snap text blocks (nothing dropped)", () => {
    const html = `<p>\n  KEEP one.\n  KEEP <b>two</b>.\n</p>`;

    assertEqual(snap(html, 1), html, "Invalid text (all sentences kept; untouched)");
    assertEqual(
        snap(`<p>Only one sentence <i>here</i>.</p>`),
        `<p>Only one sentence <i>here</i>.</p>`,
        "Invalid text (single sentence; untouched)"
    );
});

await test("Snap text siblings (ratio)", () => {
    const document = new JSDOM(`<body><p>One. Two. Three. Four.</p></body>`).window.document;
    const p = document.querySelector("p");

    snapTextSiblings([ ...p.childNodes ], [], 0.5, sentences => sentences, isActionableElement);

    assertEqual(p.innerHTML, "One. Two. ", "Invalid text (half of the sentences kept)");
});

await test("Snap text blocks (actionable sentences ranked separately)", () => {
    const calls = [];
    const recordingRanker = sentences => {
        calls.push([ ...sentences ]);

        return sentences;
    };

    snap(`<p>First plain. A <a href="/x">link</a> sentence. Second plain. Another <a href="/y">link</a> one.</p>`, 0.5, recordingRanker);

    assertEqual(
        calls,
        [
            [ "A link sentence.", "Another link one." ],
            [ "First plain.", "Second plain." ]
        ],
        "Invalid ranker calls (actionable and other sentences ranked separately)"
    );
});