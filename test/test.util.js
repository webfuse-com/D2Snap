import { join } from "path";
import { readFile as readFileFs, writeFile } from "fs/promises";


const FILES_DIRECTORY_NAME = "_files";


function filePath(fileName) {
    return join(import.meta.dirname, FILES_DIRECTORY_NAME, `${fileName}.html`);
}


export function readTestFile(fileName) {
    return readFileFs(filePath(fileName), "utf8");
}

export function readExpected(domName) {
    return readTestFile(`${domName}.expected`);
}

export function writeActual(domName, html) {
    return writeFile(filePath(`${domName}.actual`), html ?? "");
}

export function flattenDOMSnapshot(snapshot) {
    return snapshot
        .trim()
        .replace(/\s*[\n\r]+\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/>\s+</g, "><")
        .replace(/>\s+/g, ">")
        .replace(/\s+</g, "<");
}

export function qualityRatioToDownsamplingRatio(quality) {
    const r = 1 - quality;

    return {
        rE: r,
        rA: r,
        rT: r
    };
}