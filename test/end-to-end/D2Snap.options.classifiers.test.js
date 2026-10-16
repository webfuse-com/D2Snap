import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap, defaults } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza.options.classifiers");


await test("Take DOM snapshot (options.classifiers)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.7, 1, 1, {
        debug: true,
        classifiers: {
            actionableElement: elementNode => defaults.classifiers.isActionableElement(elementNode, {
                tagNames: [ "li", "STRONG" ]
            }),
            textFormattingElement: elementNode => defaults.classifiers.isTextElement(elementNode, {
                tagNames: [ "p", "B" ]
            })
        }
    });

    await writeActual("pizza/pizza.options.classifiers", snapshot.html);
    const expected = await readExpected("pizza/pizza.options.classifiers");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});