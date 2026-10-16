import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.normalizers.idiomatic");


await test("Take DOM snapshot (idiomatic, no normalization necessary)", async () => {
    const snapshot = await d2Snap(HAMBURGER_HTML, 1.0, 1.0, 1.0);

    await writeActual("hamburger/hamburger.options.normalizers.idiomatic", snapshot.html);
    const expected = await readExpected("hamburger/hamburger.options.normalizers.idiomatic");

    assertEqual(
        flattenDOMSnapshot(snapshot.html),
        flattenDOMSnapshot(expected),
        "Invalid DOM snapshot"
    );
});