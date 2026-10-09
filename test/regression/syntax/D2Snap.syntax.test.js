import { join } from "path";
import { readdir, readFile, writeFile } from "fs/promises";
import { createHash } from "node:crypto";

import { FILES_DIRECTORY_PATH as TEST_FILES_DIRECTORY_PATH, writeActual } from "../../test.util.js";

import { DEFAULT_ATTRIBUTE_SCORES } from "../../../dist.lib/var.DEFAULTS_ATTRIBUTE_SCORES.js";
import { DEFAULT_FILTER_ATTRIBUTE_NAMES } from "../../../dist.lib/var.DEFAULTS_ATTRIBUTES.js";
import { DEFAULT_CLASS_TEXT_TAG_NAMES, DEFAULT_FILTER_TAG_NAMES } from "../../../dist.lib/var.DEFAULTS_TAGS.js";
import { formatHTML, isVoidElement, isRawTextElement } from "../../../dist.lib/util.html.js";
import { getAttributeScore, isActionableElement } from "../../../dist.lib/D2Snap.js";
import { d2Snap } from "../../../dist.lib/api.js";


const IGNORED_HASHES_PATH = join(import.meta.dirname, "ignored-hashes.txt");
const LATEST_ERROR_HASHES_PATH = join(import.meta.dirname, "latest-error-hashes.txt");
const IGNORED_HASHES = (await readFile(IGNORED_HASHES_PATH))
    .toString()
    .split(/\n/g)
    .map((hash => hash.trim()))
    .filter(Boolean);
const STOP_ON_FAILURE = process.argv.slice(2).includes("--next-failure");
const FILES_DIRECTORY_PATH = join(TEST_FILES_DIRECTORY_PATH, "_regression");
// Downsample aggressively, but not full to keep expressive attributes for checks
const DOWNSAMPLING_RATIOS = {
    rE: 0.9,
    rA: 0.9,
    rT: 0.9
};
// Stay close to defaults.
const DOWNSAMPLING_ATTRIBUTE_SCORES = {
    ...DEFAULT_ATTRIBUTE_SCORES,

    "aria-labelledby": 1.0,
    "aria-label": 1.0,
    "text": 1.0,
};
const DOWNSAMPLING_ARGS = [
    DOWNSAMPLING_RATIOS.rE,
    DOWNSAMPLING_RATIOS.rA,
    DOWNSAMPLING_RATIOS.rT,
    {
        debug: true,
        attributeScores: DOWNSAMPLING_ATTRIBUTE_SCORES,
        normalize: {
            iconClasses: [ "fa", "icon", "ti" ]
        }
    }
];


const FILTERED_TAG_NAMES = new Set(DEFAULT_FILTER_TAG_NAMES.map(t => t.toUpperCase()));
const FILTERED_ATTRIBUTE_NAMES = new Set(DEFAULT_FILTER_ATTRIBUTE_NAMES.map(a => a.toLowerCase()));
const TEXT_FORMATTING_TAG_NAMES = new Set(DEFAULT_CLASS_TEXT_TAG_NAMES.map(t => t.toUpperCase()));
const TEXT_FORMATTING_PASSTHROUGH_TAG_NAMES = new Set([ "TABLE" ]);


function printFormatHTML(html, maxLength = 500) {
    if(html.length <= maxLength) return html;

    return `${
        formatHTML(html)
            .slice(0, maxLength)
    }...`;
}

function hashHTML(html) {
    return createHash("sha256")
        .update(html, "utf8")
        .digest("hex");
}

async function traverseDOM(domRoot, nodeFn) {
    const elementNodes = [];

    function collect(node, depth = 0) {
        if(depth > 0) {
            elementNodes.push({
                node,
                depth
            });
        }

        for(const child of node.children) {
            collect(child, depth + 1);
        }
    }

    collect(domRoot);

    // Deepest nodes first
    elementNodes.sort((a, b) => b.depth - a.depth);

    let stopDepth = null;

    for(const { node, depth } of elementNodes) {
        if(stopDepth !== null && depth !== stopDepth) {
            return TRAVERSE_SIGNAL.STOP_AFTER_LEVEL;
        }

        await nodeFn(
            node,
            [...node.attributes],
            [...node.childNodes].filter(
                child => child.nodeType === 3
            )
        );
    }
}

// CHECK FUNCTIONS

const contextMessage = (message, errorContextStr) => [ message, errorContextStr ].join("\n");

function checkElementNode_noFilter(element, errorContextStr) {
    // Assert element was not supposed to be filtered.
    return assertTrue(
        !FILTERED_TAG_NAMES.has(element.tagName.toUpperCase()),
        contextMessage(`Filtered element (${element.tagName.toUpperCase()}) is removed`, errorContextStr)
    );
}

function checkElementNode_SVGNormalized(element, errorContextStr) {
    // Assert SVG was noramlized to IMG.
    return assertTrue(
        element.tagName.toUpperCase() !== "SVG",
        contextMessage("SVG element is normalized to <img>", errorContextStr)
    );
}

function checkElementNode_hasDescriptor(element, errorContextStr) {
    // Assert actionable element has an idiomatic descripto; in general (recoverable) direct descendant text contents.
    if(
        !isActionableElement(element)   // check all?
        || isVoidElement(element.tagName)
        || isRawTextElement(element.tagName)
    ) {
        return true;
    }
    if(([ ...element.children ].some(child => isActionableElement(child)))) {
        return true;
    }
    if((element.tagName.toUpperCase() === "A" && !element.hasAttribute("href"))) {
        return true;
    }
    const elementHasDescriptor = (
        element.hasAttribute("aria-labelledby")
        || element.hasAttribute("aria-label")
        || element.hasAttribute("title")
    );
    if(!elementHasDescriptor) {
        return true;
    }

    const hasText = !!element.textContent.trim().length;

    return assertTrue(
        hasText,
        contextMessage("Actionable element has proper descriptor", errorContextStr)
    );
}

function checkElementNode_textWasFormatted(element, errorContextStr) {
    // Assert element was not supposed to be text formatted via MD.
    if(isActionableElement(element)) return true;

    const tagName = element.tagName.toUpperCase();

    if(!TEXT_FORMATTING_TAG_NAMES.has(tagName)) return true;
    if(TEXT_FORMATTING_PASSTHROUGH_TAG_NAMES.has(tagName)) return true;

    for(let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        if(isActionableElement(ancestor)) return true;

        if(ancestor !== element && TEXT_FORMATTING_PASSTHROUGH_TAG_NAMES.has(ancestor.tagName.toUpperCase())) return true;
    }

    return assertTrue(
        false,
        contextMessage(`Text formatting element (${element.tagName.toUpperCase()}) is converted to markdown`, errorContextStr)
    );
}

function checkElementNode(element, errorContextStr) {
    return (
        checkElementNode_noFilter(element, errorContextStr)
        && checkElementNode_SVGNormalized(element, errorContextStr)
        && checkElementNode_hasDescriptor(element, errorContextStr)
        && checkElementNode_textWasFormatted(element, errorContextStr)
    );
}

function checkAttribute_noFilter(attr, errorContextStr) {
    // Assert attribute was not supposed to be filtered.
    return assertTrue(
        !FILTERED_ATTRIBUTE_NAMES.has(attr.name.toLowerCase()),
        contextMessage(`Filtered attribute (${attr.name}) is removed`, errorContextStr)
    );
}

function checkAttribute_scoresAboveThreshold(attr, errorContextStr) {
    // Assert preserved attribute score is not below threshold.
    const attributeScore = getAttributeScore(attr.name, new Map(
        Object.entries(DOWNSAMPLING_ATTRIBUTE_SCORES)
            .map(entry => [ entry[0].toLowerCase(), entry[1] ])
    ));

    return assertMore(
        attributeScore,
        DOWNSAMPLING_RATIOS.rA - Number.EPSILON,
        contextMessage(`Attribute (${attr.name}) has score less or equal to threshold (${DOWNSAMPLING_RATIOS.rA})`, errorContextStr)
    );
}

function checkAttribute_valueIsNoDataURL(attr, errorContextStr) {
    // Assert attribute value is no data URL (filtered by default).
    return assertTrue(
        !/^\s*data:/i.test(attr.value),
        contextMessage(`Attribute (${attr.name}) value is no data URL`, errorContextStr)
    );
}

function checkAttributeNode(attr, errorContextStr) {
    return (
        checkAttribute_noFilter(attr, errorContextStr)
        && checkAttribute_scoresAboveThreshold(attr, errorContextStr)
        && checkAttribute_valueIsNoDataURL(attr, errorContextStr)
    );
}

function checkTextNode(text, errorContextStr) {
    // Empty text notes are possible: no-op for now.
    return true;
}


// RUNNER

class StopSignalError extends Error {}
class MaxSignalError extends Error {}

await (async () => {
    const testDirents = await readdir(FILES_DIRECTORY_PATH, { withFileTypes: true });

    const testCaseDirents = testDirents
        .filter(dirent => dirent.isFile())
        .filter(dirent => dirent.name.endsWith(".html"))
        .filter(dirent => !dirent.name.endsWith(".actual.html"));

    if(!testCaseDirents.length) throw new RangeError("No test cases found");

    const errorHashes = new Set();

    try {
        for(const dirent of testCaseDirents) {
            let hasFileMessage = false;
            let hasFileError = false;

            const record = (passed, htmlOutputHash) => {
                if(passed) return;

                errorHashes.add(htmlOutputHash);

                hasFileError = true;

                if(STOP_ON_FAILURE) throw new StopSignalError();
            };

            const rawHTML = await readFile(join(FILES_DIRECTORY_PATH, dirent.name));

            console.log(`\x1b[2m… Checking \x1b[3m\x1b[34m${dirent.name}\x1b[23m\x1b[30m (${rawHTML.length} B).\x1b[0m`);

            const downsamplingResult = await d2Snap(rawHTML, ...DOWNSAMPLING_ARGS);

            await writeActual(`_regression/${dirent.name.replace(/\.html$/i, "")}`, downsamplingResult.html);

            await traverseDOM(
                downsamplingResult.dom,
                async (elementNode, attrNodes, textNodes) => {
                    const htmlOutputHash = hashHTML(elementNode.outerHTML);

                    if(IGNORED_HASHES.includes(htmlOutputHash)) {
                        console.log(`\x1b[2mIgnoring output HTML with hash ${htmlOutputHash}.\x1b[0m`);

                        hasFileMessage = true;

                        return;
                    }

                    const getOuterHTMLOnly = elementNode => elementNode.cloneNode(false).outerHTML;

                    const getErrorContextStr = (outerHTMLOnly = true) => {
                        const errStr = printFormatHTML(outerHTMLOnly ? getOuterHTMLOnly(elementNode) : elementNode.outerHTML);
                        return [
                            `\x1b[2m${errStr}`,
                            `\x1b[35m${htmlOutputHash}`,
                            `\x1b[30m${"-".repeat(
                                errStr
                                    .split(/\n/g)
                                    .reduce((p, c) => Math.max(p, c.length), 0)
                            )}`,
                            `\x1b[0m`
                        ].join("\n");
                    };

                    record(checkElementNode(elementNode, getErrorContextStr(false)), htmlOutputHash);

                    for(const attrNode of attrNodes) {
                        record(checkAttributeNode(attrNode, getErrorContextStr(true)), htmlOutputHash);
                    }
                    for(const textNode of textNodes) {
                        record(checkTextNode(textNode, getErrorContextStr(true)), htmlOutputHash);
                    }
                }
            );

            if(!hasFileError) {
                process.stdout.write(`${!hasFileMessage ? "\x1b[1A" : ""}\x1b[1m\x1b[32m✓\x1b[0m\n`);
            }
        }
    } catch(err) {
        if(err instanceof StopSignalError) {
            console.log("\x1b[31mStopped on next failure.\x1b[0m");

            return;
        }
        if(err instanceof MaxSignalError) {
            console.log(`\x1b[31mStopped on failure limit (${MAX_FAILURES}).\x1b[0m`);

            return;
        }
        
        throw err;
    } finally {
        await writeFile(LATEST_ERROR_HASHES_PATH, [ ...errorHashes ].join("\n"));
    }
})();