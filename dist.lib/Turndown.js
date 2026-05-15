import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
class Turndown {
  service;
  constructor(keepTagNames) {
    this.service = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced"
    });
    const normalizedKeepTagNames = new Set(keepTagNames.map((tag) => tag.toLowerCase()));
    this.service.addRule("keep", {
      filter: (node) => node.nodeType === 1 && normalizedKeepTagNames.has(node.tagName.toLowerCase()),
      replacement: (_content, node) => node.outerHTML
    });
    this.service.use(gfm);
  }
  translate(html) {
    return this.service.turndown(html).trim();
  }
}
export {
  Turndown
};
