import { createInterface } from "readline";

import { chromium } from "playwright";

import { d2Snap } from "../dist.lib/api.js";


const MAX_HTML_LENGTH = 25;


const READLINE = createInterface({
    input: process.stdin,
    output: process.stdout
});


async function inject() {
    const url = await new Promise(r => {
        READLINE.question("\x1b[1mURL\x1b[0m >> ", r);
    });
    const rawParams = (
        await new Promise(r => {
            READLINE.question("\x1b[1mrE[,rA,rT]\x1b[0m >> ", r);
        })
    ).split(/,/g);
    const params = Array.from({ length: 3}, (param, i) => parseFloat(rawParams[i] ?? rawParams[0] ?? param));

    console.log(`\x1b[31m${params.join(", ")}\x1b[0m`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(url);

    const bodyHTML = await page.evaluate(() => document.body.outerHTML);

    const snapshot = await d2Snap(
        bodyHTML,
        params[0], params[1], params[2]
    );

    snapshot.html = (snapshot.html.length > MAX_HTML_LENGTH)
        ? `${snapshot.html.slice(0, MAX_HTML_LENGTH)}...`
        : snapshot.html;

    console.log(JSON.stringify(snapshot, null, 2));

    await browser.close();

    READLINE.close();
}


await inject();