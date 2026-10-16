import { deepMerge } from "../../dist.lib/util.obj.js";


await test("Deep merge two objects", async () => {
    assertEqual(
        deepMerge({
            a: 1,
            b: 2,
            c: {
                a: 1,
                b: 2,
                c: {
                    a: 1,
                    b: 2
                }
            }
        }, {
            b: 3,
            c: {
                b: 3,
                c: {
                    b: 3
                },
                d: 4
            },
            d: {
                a: 2
            },
            e: 5
        }),
        {
            a: 1,
            b: 3,
            c: {
                a: 1,
                b: 3,
                c: {
                    a: 1,
                    b: 3
                },
                d: 4
            },
            d: {
                a: 2
            },
            e: 5
        },
        "Invalid deep-merged objects"
    );
});

await test("Deep merge two objects (arrays, null, functions)", async () => {
    const fn = () => true;
    const target = {
        list: [ 1, 2 ],
        nested: {
            list: [ 1 ],
            value: 1
        },
        nullable: {
            a: 1
        },
        callback: () => false
    };

    const merged = deepMerge(target, {
        list: [ 3 ],
        nested: {
            list: []
        },
        nullable: null,
        callback: fn
    });

    assertEqual(
        merged,
        {
            list: [ 3 ],
            nested: {
                list: [],
                value: 1
            },
            nullable: null,
            callback: fn
        },
        "Invalid deep-merged objects (arrays replaced, null overrides, functions taken)"
    );
    assertEqual(
        target.nested,
        {
            list: [ 1 ],
            value: 1
        },
        "Invalid deep merge (target mutated)"
    );
});

await test("Deep merge two objects (undefined keeps target)", async () => {
    assertEqual(
        deepMerge(
            {
                debug: false,
                classifiers: {
                    actionableElement: "default",
                    textFormattingElement: "default"
                },
                sentenceRanker: "default"
            },
            {
                debug: undefined,
                classifiers: undefined,
                sentenceRanker: null
            }
        ),
        {
            debug: false,
            classifiers: {
                actionableElement: "default",
                textFormattingElement: "default"
            },
            sentenceRanker: null
        },
        "Invalid deep-merged objects (undefined keeps target, null overrides)"
    );
    assertEqual(
        deepMerge(
            { classifiers: { actionableElement: "default", textFormattingElement: "default" } },
            { classifiers: { actionableElement: "custom", textFormattingElement: undefined } }
        ),
        { classifiers: { actionableElement: "custom", textFormattingElement: "default" } },
        "Invalid deep-merged objects (nested undefined keeps target)"
    );
});