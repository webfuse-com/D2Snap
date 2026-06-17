import TurndownService from "turndown";
import { gfm } from "@truto/turndown-plugin-gfm";
class Turndown {
  service;
  constructor(retainElementCbs = []) {
    this.service = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced"
    });
    this.service.addRule("retain", {
      filter: (node) => {
        if (node.nodeType !== 1) return false;
        const elementNode = node;
        for (const retainElementCb of retainElementCbs) {
          if (retainElementCb(elementNode)) return true;
        }
        return false;
      },
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
