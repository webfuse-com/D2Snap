import { readTestFile, writeActual, readExpected } from "../test.util.js";

import { d2Snap } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.options.normalizers.defaults");


await test("Take DOM snapshot (options.normalizers; defaults)", async () => {
    const snapshotHamburger = await d2Snap(HAMBURGER_HTML, 0.5, 0.5, 0.5, {
        debug: true
    });

    await writeActual("hamburger/hamburger.options.normalizers.defaults", snapshotHamburger.html);
    const expectedHamburger = await readExpected("hamburger/hamburger.options.normalizers.defaults");

    assertEqual(
        snapshotHamburger.html,
        expectedHamburger,
        "Invalid DOM snapshot (hamburger)"
    );
});