import { join } from "path";
import { readFile as readFileFs, writeFile } from "fs/promises";


const FILES_DIRECTORY_NAME = "_files";

export const FILES_DIRECTORY_PATH = join(import.meta.dirname, FILES_DIRECTORY_NAME);


function filePath(fileName) {
    return join(FILES_DIRECTORY_PATH, `${fileName}.html`);
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