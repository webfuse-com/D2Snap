import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.uiFeatureHeuristics + options.uiFeatureHeuristicsReplaceDefault)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.3, 0.3, 0.3, {
        debug: true,
        uiFeatureHeuristics: {
            "typeElement": {
                "container": {
                    "ratings": {
                        "div": 0.70
                    }
                },
            },
            "typeAttribute": {
                "ratings": {
                    "required": 0.2,
                    "tabindex": 0.1
                }
            }
        }
    });

    await writeActual("pizza/pizza.ui-feature-heuristics", snapshot.html);
    const expected = await readExpected("pizza/pizza.ui-feature-heuristics");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );

    const snapshotReplace = await d2Snap(PIZZA_HTML, 0.3, 0.3, 0.3, {
        debug: true,
        uiFeatureHeuristics: {
            "typeElement": {
                "container": {
                    "tagNames": [
                        "div"
                    ],
                    "ratings": {
                        "div": 0.70
                    },
                    "fallbackRating": 0.5
                },
                "actionable": {
                    "tagNames": []
                },
                "textFormatting": {
                    "tagNames": [
                        "h1"
                    ]
                }
            },
            "typeAttribute": {
                "ratings": {
                    "required": 0.2,
                    "tabindex": 0.1
                },
                "fallbackRating": 0.7
            }
        },
        uiFeatureHeuristicsReplaceDefault: true
    });

    await writeActual("pizza/pizza.ui-feature-heuristics.replace", snapshotReplace.html);
    const expectedReplace = await readExpected("pizza/pizza.ui-feature-heuristics.replace");

    assertEqual(
        flattenDOMSnapshot(snapshotReplace.html),
        flattenDOMSnapshot(expectedReplace),
        "Invalid DOM snapshot (replace)"
    );

    const snapshotAttributeWildcard = await d2Snap(PIZZA_HTML, 0, 0.3, 1, {
        debug: true,
        uiFeatureHeuristics: {
            "typeAttribute": {
                "ratings": {
                    "class": 0,
                    "required": 0,
                    "tabindex": 0,
                    "type": 0,

                    "aria-label": 0.2,
                    "aria-description": 0.4,
                    "aria-*": 0.5,
                    "data-*": 1.0
                }
            }
        }
    });

    await writeActual("pizza/pizza.ui-feature-heuristics.attribute-wildcard", snapshotAttributeWildcard.html);
    const expectedARIA = await readExpected("pizza/pizza.ui-feature-heuristics.attribute-wildcard");

    assertEqual(
        flattenDOMSnapshot(snapshotAttributeWildcard.html),
        flattenDOMSnapshot(expectedARIA),
        "Invalid DOM snapshot (attribute wildcard suffix '{aria-|data-}*')"
    );
});