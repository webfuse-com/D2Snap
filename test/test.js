import { join } from "path";
import { deepEqual as assertEqual, ok } from "assert";


function wrapAssertion(cb, actual = null, expected = null, relationHint = null) {
    try {
        cb();
    } catch(err) {
        if(err.code !== "ERR_ASSERTION") {
            console.error(err);

            process.exit(1);
        }

        console.error(`\x1b[31mAssertion Error${err.message ? ` '${err.message}'` : ""}\x1b[0m`);
        console.log(`\x1b[2mEXPECTED${relationHint ? ` (${relationHint})` : ""}:\x1b[0m`, expected ?? err.expected);
        console.log("\x1b[2mACTUAL:\x1b[0m", actual ?? err.actual);

        process.exit(2);
    }
}

global.assertEqual = function(a, b, message) {
    wrapAssertion(() => assertEqual(a, b, message));
}

global.assertLess = function(a, b, message) {
    wrapAssertion(() => ok(a < b, message), a, b, "<");
}

global.assertMore = function(a, b, message) {
    wrapAssertion(() => ok(a > b, message), a, b, ">");
}

global.assertIn = function(a, b, message) {
    wrapAssertion(() => ok(b.includes(a), message), a, b, "in");
}

global.assertAlmostEqual = function(a, b, precision, message) {
    const roundPrecision = a => Math.round(a * 10**precision) / 10**precision;

    const roundA = roundPrecision(a);
    const roundB = roundPrecision(b);

    wrapAssertion(() => assertEqual(roundA, roundB, message), roundA, roundB, "~");
}

global.path = function(fileName) {
    return join(import.meta.dirname, `${fileName}.html`);
}

global.test = async function(title, cb) {
    console.log(`\x1b[2m${title}\x1b[0m`);

    await cb();
}


process.on("exit", code => {
    code
        ? console.error(`\x1b[31mTests failed (exit code ${code}).\x1b[0m`)
        : console.log(`\x1b[32mTests succeeded.\x1b[0m`);
});


[
    "test.Turndown",
    "test.TextRank",
    "test.D2Snap.dom",
    "test.D2Snap.string"
]
    .forEach(async reference => {
        await import(join(import.meta.dirname, reference.replace(/(\.js)?$/i, ".js")));
    });