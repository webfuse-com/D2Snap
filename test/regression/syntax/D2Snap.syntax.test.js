import { join } from "path";
import { readdir, readFile } from "fs/promises";

import { FILES_DIRECTORY_PATH as TEST_FILES_DIRECTORY_PATH, writeActual } from "../../test.util.js";

// Work with all defaults.
import { formatHTML, isVoidElement } from "../../../dist.lib/util.html.js";
import { getAttributeScore, isActionableElement } from "../../../dist.lib/D2Snap.js";
import { d2Snap } from "../../../dist.lib/api.js";


const STOP_ON_FAILURE = process.argv.slice(2).includes("--next-failure");
const FILES_DIRECTORY_PATH = join(TEST_FILES_DIRECTORY_PATH, "_regression");
const DOWNSAMPLING_RATIOS = {
    rE: 0.1,
    rA: 0.1,
    rT: 0.1
};
const DOWNSAMPLING_ARGS = [
    DOWNSAMPLING_RATIOS.rE,
    DOWNSAMPLING_RATIOS.rA,
    DOWNSAMPLING_RATIOS.rT,
    {
        debug: true,
        normalize: {
            iconfontsFromNames: [ "fa", "icon", "ti" ],
        }
    }
];


function printFormatHTML(html, maxLength = 500) {
    if(html.length <= maxLength) return html;

    return `${
        formatHTML(html)
            .slice(0, maxLength)
    }...`;
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

function checkElementNode(element, errorContextStr) {
    if(isActionableElement(element) && !isVoidElement(element.tagName)) {
        // Assert preserved actionable element is not without description.
        return assertMore(
            element.textContent.trim().length,
            0,
            [
                "Actionable element has empty text (expect descriptor)",
                errorContextStr
            ].join("\n")
        );
    }

    return true;
}

function checkAttributeNode(attr, errorContextStr) {
    // Assert preserved attribute score is not below threshold.
    const attributeScore = getAttributeScore(attr.name);

    return assertMore(
        attributeScore,
        DOWNSAMPLING_RATIOS.rA - Number.EPSILON,
        [
            `Attribute (${attr.name}) has score below threshold (${DOWNSAMPLING_RATIOS.rA})`,
            errorContextStr
        ].join("\n")
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

    try {
        for(const dirent of testCaseDirents) {
            let hasFileError = false;

            const record = passed => {
                if(passed) return;

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
                    const getOuterHTMLOnly = elementNode => elementNode.cloneNode(false).outerHTML;

                    const getErrorContextStr = (outerHTMLOnly = true) => {
                        const errStr = printFormatHTML(outerHTMLOnly ? getOuterHTMLOnly(elementNode) : elementNode.outerHTML);
                        return [
                            `\x1b[2m${errStr}`,
                            `\x1b[30m${"-".repeat(
                                errStr
                                    .split(/\n/g)
                                    .reduce((p, c) => Math.max(p, c.length), 0)
                            )}\x1b[0m`
                        ].join("\n");
                    };

                    record(checkElementNode(elementNode, getErrorContextStr(false)));

                    for(const attrNode of attrNodes) {
                        record(checkAttributeNode(attrNode, getErrorContextStr(true)));
                    }
                    for(const textNode of textNodes) {
                        record(checkTextNode(textNode, getErrorContextStr(true)));
                    }
                }
            );

            if(!hasFileError) {
                process.stdout.write("\x1b[1A\x1b[1m\x1b[32m✓\x1b[0m\n");
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
    }
})();