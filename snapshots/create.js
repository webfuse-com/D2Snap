import { createInterface } from "readline";
import { join } from "path";
import { readFileSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";

import { chromium } from "playwright";


const READLINE = createInterface({
    input: process.stdin,
    output: process.stdout
});
const DATA = (() => {
    const raw = readFileSync(join(import.meta.dirname, "../dataset", "data.jsonl")).toString();
    return raw
        .split(/\n/g)
        .map(record => record.trim())
        .filter(record => !!record)
        .map(record => JSON.parse(record));
})();
const CANDIDATES_DIR = join(import.meta.dirname, "candidates");
const CANDIDATES_DIRS = {
    gui: join(CANDIDATES_DIR, "gui"),
    dom: join(CANDIDATES_DIR, "dom"),
    bu: join(CANDIDATES_DIR, "bu")
};


async function takeSnapshot(page, record) {
    await page.goto(record.url);

    console.log("----------");
    console.log(record.url);
    console.log(record.task);
    await new Promise(r => {
        READLINE.question("\x1b[1mPRESS ENTER TO TAKE SNAPSHOTS\x1b[0m >> ", r);
    });
    console.log("Taking snapshots...")

    await page.evaluate(async () => {
        const scrollTarget = document.scrollingElement || document.documentElement;
        window.scrollTo(0, scrollTarget.scrollHeight);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // DOM
    const serializedDOM = await page.evaluate(() => document.documentElement.outerHTML);

    await writeFile(join(CANDIDATES_DIRS.dom, `${record.id}.html`), serializedDOM);

    // GUI
    await page.screenshot({ path: join(CANDIDATES_DIRS.gui, `${record.id}.png`), fullPage: true });

    // BU
    const buIndexes = await page.evaluate(
        (script) => new Function(script)(),
        readFileSync(join(import.meta.dirname, "_bu.js")).toString()
    );

    await page.waitForTimeout(250);

    await page.screenshot({ path: join(CANDIDATES_DIRS.bu, `${record.id}.png`), fullPage: true });

    await writeFile(join(CANDIDATES_DIRS.bu, `${record.id}.txt`), buIndexes.join("\n"));
}

async function takeSnapshots() {
    Object.values(CANDIDATES_DIRS)
        .forEach(candidateDir => mkdirSync(candidateDir, {
            recursive: true
        }));

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const shift = parseInt(process.argv.slice(2)[0] ?? 0) ?? 0;
    for(let i = shift; i < DATA.length; i++) {
        console.log(`(${i})`);

        await takeSnapshot(page, DATA[i]);
    }

    await browser.close();

    READLINE.close();
}


await takeSnapshots();