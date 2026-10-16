import { readTestFile, writeActual, readExpected, flattenDOMSnapshot } from "../test.util.js";

import { adaptiveD2Snap } from "../../dist.lib/api.js";


const HAMBURGER_HTML = await readTestFile("hamburger/hamburger.defaults");


await test("Take adaptive DOM snapshot (defaults)", async () => {
    // Between the most reduced (82 tokens) and the unreduced snapshot (254 tokens)
    const maxTokens = 200;
    const snapshotHamburger = await adaptiveD2Snap(HAMBURGER_HTML, maxTokens);

    assertTrue(snapshotHamburger.meta.tokenEstimate <= maxTokens, `Token limit exceeded (${snapshotHamburger.meta.tokenEstimate} > ${maxTokens})`);
    assertTrue(snapshotHamburger.meta.tokenEstimate >= 0.95 * maxTokens, `Not close to the token limit (${snapshotHamburger.meta.tokenEstimate} for ${maxTokens})`);

    const { rE, rA, rT } = snapshotHamburger.parameters;
    assertTrue(rE === rA && rA === rT, "Invalid parameters (r = rE = rA = rT)");

    await writeActual("hamburger/hamburger.defaults.adaptive", snapshotHamburger.html);
    const expectedHamburger = await readExpected("hamburger/hamburger.defaults.adaptive");

    assertEqual(
        flattenDOMSnapshot(snapshotHamburger.html),
        flattenDOMSnapshot(expectedHamburger),
        "Invalid DOM snapshot (hamburger)"
    );
});