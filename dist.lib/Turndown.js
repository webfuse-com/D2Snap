// src/Turndown.ts
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
var KEEP_TAG_NAMES = ["a"];
var SERVICE = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced"
});
SERVICE.addRule("keep", {
  filter: KEEP_TAG_NAMES,
  replacement: (_, node) => "outerHTML" in node ? node.outerHTML : ""
});
SERVICE.use(gfm);
var KEEP_LINE_BREAK_MARK = "@@@";
function turndown(markup) {
  return SERVICE.turndown(markup).trim().replace(/\n/g, KEEP_LINE_BREAK_MARK);
}
export {
  KEEP_LINE_BREAK_MARK,
  turndown
};
