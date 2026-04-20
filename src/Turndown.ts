// --------------------------
// Copyright (c) Dom Christie
// --------------------------

import TurndownService, { Filter } from "turndown";
import { gfm } from "turndown-plugin-gfm"


const KEEP_TAG_NAMES = [ "a" ];

const SERVICE = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
});

SERVICE.addRule("keep", {
    filter: KEEP_TAG_NAMES as Filter,
    replacement: (_: string, node: Node) => ("outerHTML" in node) ? (node.outerHTML as string) : ""
});

SERVICE.use(gfm);


export const KEEP_LINE_BREAK_MARK = "@@@";


export function turndown(markup: string): string {
    return SERVICE
        .turndown(markup)
        .trim()
        .replace(/\n/g, KEEP_LINE_BREAK_MARK);
}