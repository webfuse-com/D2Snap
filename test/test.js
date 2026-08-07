import { join } from "path";
import { readdir } from "fs/promises";
import { deepEqual as assertEqual, ok, throws } from "assert";


const TEST_DIR_PATH = join(import.meta.dirname, "./tests");


let exitCode = 0;


// Test framework

function wrapAssertion(cb, actual = null, expected = null, relationHint = null) {
    relationHint = relationHint ? ` ${relationHint}` : "";

    const printValue = (value, max = 250) => {
        if(typeof(value) !== "string") return value;

        if(value.length < max) return value;

        return `${value.slice(0, max)}...`;
    };

    try {
        cb();
    } catch(err) {
        if(err.code !== "ERR_ASSERTION") {
            console.error(err);

            process.exit(1);
        }

        console.error(`\x1b[31mAssertion Error${err.message ? ` '${err.message}'` : ""}\x1b[0m`);
        console.log(`\x1b[2mEXPECTED${relationHint}:\x1b[0m`, printValue(expected ?? err.expected));
        console.log(`\x1b[2mACTUAL${relationHint}:\x1b[0m`, printValue(actual ?? err.actual));

        exitCode = 2;
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

global.assertNotIn = function(a, b, message) {
    wrapAssertion(() => ok(!b.includes(a), message), a, b, "not in");
}

global.assertAlmostEqual = function(a, b, precision, message) {
    const roundPrecision = a => Math.round(a * 10**precision) / 10**precision;

    const roundA = roundPrecision(a);
    const roundB = roundPrecision(b);

    wrapAssertion(() => assertEqual(roundA, roundB, message), roundA, roundB, "~");
}

global.assertThrows = function(fn, message) {
    wrapAssertion(() => throws(fn, null, message), fn);
}


global.path = function(fileName) {
    return join(import.meta.dirname, `${fileName}.html`);
}


global.test = async function(title, cb) {
    console.log(`\x1b[2m${title}\x1b[0m`);

    try {
        await cb();
    } catch(err) {
        console.error(`\x1b[31mTest Error${err.message ? ` '${err.message}'` : ""}\x1b[0m`);

        exitCode = 3;
    }
}


// Run

const testDirents = await readdir(TEST_DIR_PATH, {
    withFileTypes: true
});

for(
    const dirent of testDirents
        .filter(dirent => dirent.isFile())
        .filter(dirent => dirent.name.endsWith(".test.js"))
) {
    await import(join(TEST_DIR_PATH, dirent.name));
}

exitCode
    ? console.error(`\x1b[31mTests failed (exit code ${exitCode}).\x1b[0m`)
    : console.log(`\x1b[32mTests succeeded.\x1b[0m`);

process.exit(exitCode);