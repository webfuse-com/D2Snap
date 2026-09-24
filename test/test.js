import { join } from "path";
import { readdir } from "fs/promises";
import { deepEqual as assertEqual, ok, throws } from "assert";


const TEST_FILE_NAME_SUFFIX = ".test.js";
const TEST_SUITE_NAME = process.argv.slice(2)[0];
const TEST_CASE_NAME = process.argv.slice(2)[1];

if(!TEST_SUITE_NAME) throw new Error("Missing test suite name (arg pos 0)");

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


global.assertTrue = function(a, message) {
    wrapAssertion(() => ok(a, message));
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


async function runSuite(suiteName, caseName = null) {
    const testDirPath = join(import.meta.dirname, suiteName);
    const testDirents = await readdir(testDirPath, {
        withFileTypes: true
    });

    const testCaseDirents = testDirents
        .filter(dirent => dirent.isFile())
        .filter(dirent => dirent.name.endsWith(TEST_FILE_NAME_SUFFIX))
        .filter(dirent => caseName ? (dirent.name === `${caseName}${TEST_FILE_NAME_SUFFIX}`) : true);

    if(!testCaseDirents.length) throw new RangeError("No test cases found");

    for(const dirent of testCaseDirents) {
        await import(join(testDirPath, dirent.name));
    }

    const nameLogPrefix = `\x1b[1m[${suiteName.toUpperCase()}]\x1b[22m`;
    exitCode
        ? console.error(`\x1b[31m${nameLogPrefix} Tests failed (exit code ${exitCode}).\x1b[0m`)
        : console.log(`\x1b[32m${nameLogPrefix} Tests succeeded.\x1b[0m`);

    process.exit(exitCode);
}


await runSuite(TEST_SUITE_NAME, TEST_CASE_NAME);