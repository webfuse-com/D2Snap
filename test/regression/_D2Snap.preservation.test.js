import { join } from "path";
import { readdir, readFile } from "fs/promises";

import { JSDOM } from "jsdom";

import { FILES_DIRECTORY_PATH, writeActual } from "../test.util.js";

// Work with all defaults
import { getAttributeScore, isActionableElement } from "../../dist.lib/D2Snap.js";
import { d2Snap } from "../../dist.lib/api.js";


const STOP_ON_FAILURE = process.argv.slice(2).includes("--fail-stop");
const RETENTION_FILES_DIRECTORY_PATH = join(FILES_DIRECTORY_PATH, "_regression");
const RETENTION_DOWNSAMPLING_RATIOS = {
    rE: 0.1,
    rA: 0.1,
    rT: 0.1
};


async function checkDOMTree(dom, nodeCheckFn) {
    const document = dom.ownerDocument ?? dom;
    const walker = document.createTreeWalker(dom, 1);

    let element = walker.currentNode;

    while(element) {
        await nodeCheckFn(
            element,
            [ ...element.attributes ],
            [ ...element.childNodes ].filter(node => node.nodeType === 3)
        );

        element = walker.nextNode();
    }
}

function checkElement(element) {
    if(isActionableElement(element)) {
        // Assert preserved actionable element is not without description.
        return assertMore(
            element.textContent.trim().length,
            0,
            "Actionable element has no descriptor text"
        );

    }

    return false;
}

function checkAttribute(attr) {
    // Assert preserved attribute score is not below threshold.
    const attributeScore = getAttributeScore(attr.name);

    return assertMore(
        attributeScore,
        RETENTION_DOWNSAMPLING_RATIOS.rA - 0.0001,
        `Attribute (${attr.name}) score is below set threshold`
    );
}

function checkText(text) {
    // Empty text notes are possibl: no-op for now.

    return false;
}

function truncateHTML(html, maxLength = 100) {
    if(html.length <= maxLength) return html;

    return `${html.slice(0, maxLength)}...`;
}


await (async () => {
    const testDirents = await readdir(RETENTION_FILES_DIRECTORY_PATH, {
        withFileTypes: true
    });

    const testCaseDirents = testDirents
        .filter(dirent => dirent.isFile())
        .filter(dirent => dirent.name.endsWith(".html"))
        .filter(dirent => !dirent.name.endsWith(".actual.html"));

    if(!testCaseDirents.length) throw new RangeError("No test cases found");

    for(const dirent of testCaseDirents) {
        const rawHTML = await readFile(join(RETENTION_FILES_DIRECTORY_PATH, dirent.name));

        console.log(`\x1b[2mChecking \x1b[3m\x1b[34m${dirent.name}\x1b[23m\x1b[30m (${rawHTML.length} B)...\x1b[0m`);

        process.stdout.write(`\x1b[2m• 1st PASS: Parse > Downsample...\x1b[0m\n`);

        let hasError = false;

        const logPassSuccess = () => process.stdout.write("\x1b[1A\x1b[1m\x1b[32m✓\x1b[0m\n");

        // FIRST PASS: Traverse DOM, then downsample each DOM subtree.

        await checkDOMTree(
            new JSDOM(rawHTML).window.document.documentElement,
            async (elementNode, attrNodes, textNodes) => {
                const subtreeDownsamplingResult = await d2Snap(
                    elementNode.outerHTML,
                    RETENTION_DOWNSAMPLING_RATIOS.rE,
                    RETENTION_DOWNSAMPLING_RATIOS.rA,
                    RETENTION_DOWNSAMPLING_RATIOS.rT,
                    {
                        debug: true
                    }
                );

                let _hasError = checkElement(elementNode, rawHTML);

                attrNodes.forEach(attrNode => {
                    _hasError |= checkAttribute(attrNode);
                });
                textNodes.forEach(textNode => {
                    _hasError |= checkText(textNode, rawHTML);
                });

                if(_hasError) {
                    console.error([
                        "\x1b[2mHTML IN:\x1b[0m",
                        truncateHTML(elementNode.outerHTML),
                        "\x1b[2mHTML OUT:\x1b[0m",
                        truncateHTML(subtreeDownsamplingResult.outerHTML)
                    ].join("\n"));
                }

                hasError |= _hasError;

                if(STOP_ON_FAILURE && hasError) {
                    setImmediate(() => process.exit());

                    return;
                }
            }
        );

        if(hasError) continue;

        logPassSuccess();

        // SECOND PASS: Downsample full DOM subtree, then traverse DOM.
        // Only if first pass succeeded.

        console.log(`\x1b[2m• 2nd PASS: Downsample > Parse...\x1b[0m`);

        const downsamplingResult = await d2Snap(
            rawHTML,
            RETENTION_DOWNSAMPLING_RATIOS.rE,
            RETENTION_DOWNSAMPLING_RATIOS.rA,
            RETENTION_DOWNSAMPLING_RATIOS.rT,
            {
                debug: true
            }
        );

        await writeActual(`_regression/${dirent.name.replace(/\.html$/i, "")}`, downsamplingResult.html);

        await checkDOMTree(
            downsamplingResult.dom,
            (elementNode, attrNodes, textNodes) => {
                hasError |= checkElement(elementNode);
                attrNodes.forEach(attrNode => {
                    hasError |= checkAttribute(attrNode);
                });
                textNodes.forEach(textNode => {
                    hasError |= checkText(textNode, rawHTML);
                });

                if(STOP_ON_FAILURE && hasError) {
                    setImmediate(() => process.exit());

                    return;
                }
            }
        );

        logPassSuccess();
    }
})();