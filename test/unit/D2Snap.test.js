import { getAttributeScore, resolveD2SnapArgs } from "../../dist.lib/D2Snap.js";

await test("Get attribute scores", () => {
    // Disjunction checks
    const attributeScores = new Map(
        Object.entries({
            "test": 1,
            "data-override-1": 0.3,
            "data-*": 0.7,
            "data-override-2": 0.4,
            "aria-label": 0.4,
            "*": 0.2
        })
            .map(entry => [ entry[0].toLowerCase(), entry[1] ])
    );

    assertEqual(
        getAttributeScore("test", attributeScores),
        1,
        "Invalid retireved attribute score ('test')"
    );
    assertEqual(
        getAttributeScore("data-test", attributeScores),
        0.7,
        "Invalid retireved attribute score ('data-test'; specified wildcard)"
    );
    assertEqual(
        getAttributeScore("aria-label", attributeScores),
        0.4,
        "Invalid retireved attribute score ('aria-label')"
    );
    assertEqual(
        getAttributeScore("aria-test", attributeScores),
        0.2,
        "Invalid retireved attribute score ('data-test'; unspecified wildcard, default)"
    );
    assertEqual(
        getAttributeScore("test-test", attributeScores),
        0.2,
        "Invalid retireved attribute score ('test-test'; default)"
    );
    assertEqual(
        getAttributeScore("data-override-1", attributeScores),
        0.3,
        "Invalid retireved attribute score ('data-override-1')"
    );
    assertEqual(
        getAttributeScore("data-override-2", attributeScores),
        0.4,
        "Invalid retireved attribute score ('data-override-1')"
    );
});

await test("Resolve snapshot arguments (specific ratios)", () => {
    assertEqual(
        resolveD2SnapArgs([ 0.1, 0.2, 0.3, { debug: true } ]),
        { rE: 0.1, rA: 0.2, rT: 0.3, options: { debug: true } },
        "Invalid resolved arguments (specific ratios, options)"
    );
    assertEqual(
        resolveD2SnapArgs([ 0.1, 0.2, 0.3 ]),
        { rE: 0.1, rA: 0.2, rT: 0.3, options: {} },
        "Invalid resolved arguments (specific ratios, no options)"
    );
});

await test("Resolve snapshot arguments (ratios object)", () => {
    for(const [ ratios, expected, label ] of [
        [ { r: 0.5 }, { rE: 0.5, rA: 0.5, rT: 0.5 }, "r" ],
        [ { rE: 0.8 }, { rE: 0.8, rA: 0, rT: 0 }, "specific ratio; others fall back to 0" ],
        [ { r: 0.5, rT: 0 }, { rE: 0.5, rA: 0.5, rT: 0 }, "specific ratio overrides r" ],
        [ { r: 0.5, rE: 0.2, rA: 0.4, rT: 0.6 }, { rE: 0.2, rA: 0.4, rT: 0.6 }, "all specific ratios override r" ],
        [ {}, { rE: 0, rA: 0, rT: 0 }, "no ratios; no reduction" ]
    ]) {
        assertEqual(
            resolveD2SnapArgs([ ratios ]),
            { ...expected, options: {} },
            `Invalid resolved arguments (ratios object: ${label})`
        );
    }

    assertEqual(
        resolveD2SnapArgs([ { r: 0.5 }, { minify: false } ]),
        { rE: 0.5, rA: 0.5, rT: 0.5, options: { minify: false } },
        "Invalid resolved arguments (ratios object, options)"
    );
});

await test("Resolve snapshot arguments (invalid r)", () => {
    for(const r of [ -1, 1.5, NaN, Infinity ]) {
        let err;
        try {
            resolveD2SnapArgs([ { r } ]);
        } catch(e) {
            err = e;
        }

        assertTrue(
            (err instanceof RangeError) && err.message.startsWith("Parameter r "),
            `Invalid error for r = ${r}: ${err?.message ?? "(no error)"}`
        );
    }
});