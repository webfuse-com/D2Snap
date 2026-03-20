import { resolve, join } from "path";
import { mkdir, writeFile } from "fs/promises";

import { chromium } from "playwright";

import { d2Snap } from "../dist/api.js";


/**
 * Usage: <script> <url> [<k>[,<l>[,<m>]]]
 */


const ARGS = process.argv.slice(2);


const tmpDirPath = resolve("./tmp");
await mkdir(tmpDirPath, {
    recursive: true
});

const rawURL = ARGS[0];
if(!rawURL) throw new SyntaxError("Missing URL (arg pos 0)");

const url = new URL(rawURL);
const params = (ARGS[1] ?? "").split(",");
for(let i = 0; i < 3; i++) {
    params[i] = (params[i] ? parseFloat(params[i] || "0") : params[0]) ?? 0.5;
}

console.log(`\x1b[2m> ${url.href}\x1b[0m`)
console.log(`\x1b[2m> ${params.join(", ")}\x1b[0m`)

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto(url.href);

const serializedDOM = await page.evaluate(() => document.documentElement.outerHTML);

const downsampledDOM = await d2Snap(serializedDOM, ...params, {
    debug: true,
    keepUnknownElements: true
});

const outFilePath = join(tmpDirPath, `${url.hostname}.html`);

await writeFile(outFilePath, downsampledDOM.serializedHtml);
console.log(downsampledDOM.meta)
console.log(
    `\x1b[2m< ${outFilePath}\x1b[0m \x1b[31m${downsampledDOM.meta.snapshotSize} B (${downsampledDOM.meta.sizeRatio.toPrecision(2)}%)\x1b[0m`
);

await browser.close();