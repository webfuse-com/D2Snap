import { readTestFile, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const PIZZA_HTML = await readTestFile("pizza/pizza");


await test("Take DOM snapshot (options.labelToText.tagNames)", async () => {
    const snapshot = await d2Snap(PIZZA_HTML, 0.5, 1, 1, {
        debug: false,
		labelToText: {
            tagNames: [ "IMG" ]
        }
    });

    // TODO
});